

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Suggestion, Tool, ChatModel, ModelInfo, View, ConsoleMode, ChatMessage, MoleculeData, OrbitalData, AgentName, GroundingChunk } from './types';
import { initializeAiClient } from './services/aiClient';
import Header from './components/Header';
import ChatInput from './components/ChatInput';
import ApiKeyModal from './components/ApiKeyModal';
import ChatHistorySheet from './components/ChatHistorySheet';
import ViewRenderer from './components/ViewRenderer';
import { useConversations } from './hooks/useConversations';
import { useMemory } from './hooks/useMemory';
import { useChatHandler } from './hooks/useChatHandler';
import ConfirmationModal from './components/ConfirmationModal';
import ModelSwitchModal from './components/ModelSwitchModal';
import { IS_DEV_CONSOLE_ENABLED } from './config';
import DevConsole from './components/DevConsole';
import ConsoleToggleButton from './components/ConsoleToggleButton';
import { useDebug } from './contexts/DebugContext';
import ParticleUniverse from './components/ParticleUniverse';
import Globe from './components/Globe';
import ImageModal from './components/ImageModal';
import CodePreviewModal from './components/CodePreviewModal';
import SourceViewer from './components/SourceViewer';
import { useScrollSpy } from './hooks/useScrollSpy';
import { Trash2 } from 'lucide-react';
import { getSetting, saveSetting, getTranslatorUsage, saveTranslatorUsage, getAllWords } from './services/dbService';

const models: ModelInfo[] = [
    { id: 'gemini-2.5-flash', name: 'Kalina 2.5 Flash', description: 'Optimized for speed and efficiency.' },
    { id: 'gemini-2.5-pro', name: 'Kalina 2.5 Pro', description: 'Advanced capabilities for complex tasks.' },
    { id: 'gemini-2.5-flash-lite', name: 'Kalina 2.5 Flash Lite', description: 'A lighter, faster version for quick responses.' },
    { id: 'gemini-2.0-flash', name: 'Kalina 2.0 Flash', description: 'Previous generation Flash model.' },
    { id: 'gemini-2.0-flash-lite', name: 'Kalina 2.0 Flash Lite', description: 'Lightweight version of the 2.0 Flash model.' },
];

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
    const [selectedTool, setSelectedTool] = useState<Tool>('smart');
    const [selectedChatModel, setSelectedChatModel] = useState<ChatModel>('gemini-2.5-flash');
    const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
    const [currentView, setCurrentView] = useState<View>('chat');
    const [isHistorySheetOpen, setIsHistorySheetOpen] = useState(false);
    const [isStopConfirmOpen, setIsStopConfirmOpen] = useState(false);
    const [isModelSwitchModalOpen, setIsModelSwitchModalOpen] = useState(false);
    const [pendingPrompt, setPendingPrompt] = useState<{ prompt: string; images?: { base64: string; mimeType: string; }[]; file?: { base64: string; mimeType: string; name: string; size: number; }; url?: string; } | null>(null);
    const [translatorUsage, setTranslatorUsage] = useState<{ input: number, output: number }>({ input: 0, output: 0 });
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    
    // State for modals and attachments
    const [images, setImages] = useState<{ base64: string; mimeType: string; }[]>([]);
    const [file, setFile] = useState<{ base64: string; mimeType: string; name: string; size: number; } | null>(null);
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [codeForPreview, setCodeForPreview] = useState<{ code: string; language: string; } | null>(null);
    const [imageToEdit, setImageToEdit] = useState<{ index: number; base64: string; mimeType: string; } | null>(null);
    const [moleculeForFullScreen, setMoleculeForFullScreen] = useState<MoleculeData | null>(null);
    const [orbitalForFullScreen, setOrbitalForFullScreen] = useState<OrbitalData | null>(null);
    const [sourcesForViewer, setSourcesForViewer] = useState<GroundingChunk[] | null>(null);
    
    // State for chat input, lifted to manage from full-screen editor
    const [input, setInput] = useState('');

    // State for contextual suggestions from the AI
    const [suggestions, setSuggestions] = useState<string[]>([]);
    
    // State for code-related keywords, now fetched dynamically
    const [codeKeywords, setCodeKeywords] = useState<string[]>([]);
    const [englishWords, setEnglishWords] = useState<string[]>([]);


    // Dev Console State
    const { logs, addTokenLog, clearLogs, addLog, logError } = useDebug();
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [consoleMode, setConsoleMode] = useState<ConsoleMode>('auto');
    const [isDevConsoleVisible, setIsDevConsoleVisible] = useState(false);
    const errorCount = logs.filter(l => l.level === 'error').length;
    const warningCount = logs.filter(l => l.level === 'warn').length;

    // State for Usage Detail Views
    const [viewingUsageConvoId, setViewingUsageConvoId] = useState<string | null>(null);
    const [viewingConvo, setViewingConvo] = useState<{ user: ChatMessage; model: ChatMessage; serialNumber: number } | null>(null);

    // State for message selection and deletion
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const conversationManager = useConversations();
    const { ltm, setLtm, codeMemory, setCodeMemory, userProfile, setUserProfile } = useMemory();
    
    const chatHandler = useChatHandler({
        apiKey,
        conversations: conversationManager.conversations,
        activeConversationId: conversationManager.activeConversationId,
        ltm,
        codeMemory,
        userProfile,
        selectedTool,
        selectedChatModel,
        updateConversation: conversationManager.updateConversation,
        updateConversationMessages: conversationManager.updateConversationMessages,
        setConversations: conversationManager.setConversations,
        setActiveConversationId: conversationManager.setActiveConversationId,
        setLtm,
        setCodeMemory,
        setUserProfile,
        setActiveSuggestion,
        setSuggestions,
    });

    const { activeConversation, sortedConversations, handleNewChat, handleSelectConversation } = conversationManager;
    const { handleSendMessage, handleCancelStream, elapsedTime } = chatHandler;

    const showWelcomeScreen = !activeConversation || activeConversation.messages.length === 0;

    const messageIndices = useMemo(() => {
        if (!activeConversation) return [];
        return activeConversation.messages.map((_, index) => index);
    }, [activeConversation]);

    const activeMessageIndex = useScrollSpy(scrollContainerRef, messageIndices);
    
    const [navigatorIndex, setNavigatorIndex] = useState<number | null>(null);

    useEffect(() => {
        if (activeMessageIndex !== null) {
            setNavigatorIndex(activeMessageIndex);
        } else if (messageIndices.length > 0) {
            setNavigatorIndex(messageIndices.length - 1);
        } else {
            setNavigatorIndex(null);
        }
    }, [activeMessageIndex, messageIndices]);
    
    const handleNavigate = (direction: 'up' | 'down') => {
        const scrollContainer = scrollContainerRef.current;
        if (!scrollContainer || navigatorIndex === null || !activeConversation) return;

        const userMessageIndices = activeConversation.messages
            .map((msg, index) => (msg.role === 'user' ? index : -1))
            .filter(index => index !== -1);
        
        if (userMessageIndices.length < 1) return;

        let targetIndex: number | undefined;

        if (direction === 'down') {
            targetIndex = userMessageIndices.find(i => i > navigatorIndex);
            if (targetIndex === undefined) {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
                if (activeConversation.messages.length > 0) {
                    setNavigatorIndex(activeConversation.messages.length - 1);
                }
                return;
            }
        } else { // 'up'
            targetIndex = [...userMessageIndices].reverse().find(i => i < navigatorIndex);
            if (targetIndex === undefined) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                setNavigatorIndex(0);
                return;
            }
        }

        if (targetIndex !== undefined) {
            setNavigatorIndex(targetIndex);
            const element = document.getElementById(`message-${targetIndex}`);
            if (element) {
                const spacing = 16; // 1rem
                const containerRect = scrollContainer.getBoundingClientRect();
                const elementRect = element.getBoundingClientRect();
                const scrollTop = scrollContainer.scrollTop;
                
                const targetScrollTop = scrollTop + (elementRect.top - containerRect.top) - spacing;

                scrollContainer.scrollTo({
                    top: targetScrollTop,
                    behavior: 'smooth',
                });
            }
        }
    };
    
    const isAtStart = navigatorIndex !== null && navigatorIndex === 0;
    const isAtEnd = navigatorIndex !== null && messageIndices.length > 0 && navigatorIndex === messageIndices.length - 1;
    
    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (IS_DEV_CONSOLE_ENABLED && consoleMode === 'auto' && logs.length > 0) {
            setIsConsoleOpen(true);
        }
    }, [logs, consoleMode]);
    
    useEffect(() => {
        const checkDevTools = () => {
            const threshold = 160;
            const isOpen = window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold;
            setIsDevConsoleVisible(isOpen);
        };
        checkDevTools();
        window.addEventListener('resize', checkDevTools);
        return () => window.removeEventListener('resize', checkDevTools);
    }, []);

    useEffect(() => {
        getTranslatorUsage().then(setTranslatorUsage).catch(e => {
            console.error("Failed to load translator usage from DB", e);
        });
    }, []);

    useEffect(() => {
        saveTranslatorUsage(translatorUsage).catch(e => {
            console.error("Failed to save translator usage to DB", e);
        });
    }, [translatorUsage]);

    useEffect(() => {
        getSetting<string>('kalina_api_key').then(storedApiKey => {
            if (storedApiKey) {
                try {
                    initializeAiClient(storedApiKey);
                    setApiKey(storedApiKey);
                } catch (e) {
                    console.error("Failed to initialize with stored API key:", e);
                    setIsApiKeyModalOpen(true);
                }
            } else {
                setIsApiKeyModalOpen(true);
            }
        }).catch(() => setIsApiKeyModalOpen(true));


        fetch('/code-keywords.json')
            .then(response => response.json())
            .then(data => setCodeKeywords(data))
            .catch(error => console.error('Failed to load code keywords:', error));
            
        getAllWords().then(dbWords => {
            if (dbWords && dbWords.length > 0) {
                addLog({level: 'log', message: `Loaded ${dbWords.length} custom words from IndexedDB.`});
                setEnglishWords(dbWords);
            } else {
                fetch('/english-words.json')
                    .then(response => response.json())
                    .then(data => setEnglishWords(data))
                    .catch(error => console.error('Failed to load default english words:', error));
            }
        }).catch(dbError => {
            console.error('Failed to load words from IndexedDB, fetching default list.', dbError);
            logError(dbError); // Also log to dev console
            fetch('/english-words.json')
                .then(response => response.json())
                .then(data => setEnglishWords(data))
                .catch(fetchError => console.error('Failed to load default english words:', fetchError));
        });
            
    }, []);

    const resetStateForNewChat = useCallback(() => {
        chatHandler.setError(null);
        chatHandler.clearThinkingIntervals();
        chatHandler.setIsLoading(false);
        chatHandler.setIsThinking(false);
        chatHandler.setIsSearchingWeb(false);
        setSelectedTool('smart');
        setActiveSuggestion(null);
        setCurrentView('chat');
        setIsHistorySheetOpen(false);
        setImages([]);
        setFile(null);
        setInput('');
        setSuggestions([]);
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
    }, [chatHandler]);

    const onNewChat = useCallback(() => {
        handleNewChat();
        resetStateForNewChat();
    }, [handleNewChat, resetStateForNewChat]);

    const onSelectConversation = (id: string) => {
        handleSelectConversation(id);
        resetStateForNewChat();
    };

    const handleSelectSuggestion = (suggestion: Suggestion) => {
        if (suggestion.prompt) {
            setActiveSuggestion(suggestion);
        }
    };

    const handleSetApiKey = (key: string) => {
        try {
            initializeAiClient(key);
            saveSetting('kalina_api_key', key).catch(e => {
                logError(new Error(`Failed to save API Key to DB: ${e.message}`));
            });
            setApiKey(key);
            setIsApiKeyModalOpen(false);
        } catch (e) {
            console.error("Failed to set API key:", e);
        }
    };

    const isCodeRelated = (text: string): boolean => {
        if (!text || codeKeywords.length === 0) return false;
        const lowerText = text.toLowerCase();
        return codeKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    };

    const executeSendMessage = useCallback((prompt: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; size: number; }, url?: string, overrideModel?: ChatModel, isRetry = false) => {
        const convo = conversationManager.conversations.find(c => c.id === conversationManager.activeConversationId);
        const isFirstMessage = !convo || convo.messages.length === 0;

        handleSendMessage(prompt, images, file, url, overrideModel, isRetry);

        setTimeout(() => {
            if (scrollContainerRef.current) {
                if (isFirstMessage) {
                    scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    scrollContainerRef.current.scrollTo({
                        top: scrollContainerRef.current.scrollHeight,
                        behavior: 'smooth',
                    });
                }
            }
        }, 100);
    }, [handleSendMessage, conversationManager.conversations, conversationManager.activeConversationId]);

    const handleSendMessageWrapper = useCallback((prompt: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; size: number; }, url?: string, isRetry = false) => {
        setSuggestions([]);
        if (selectedChatModel !== 'gemini-2.5-pro' && isCodeRelated(prompt) && !isRetry) {
            setPendingPrompt({ prompt, images, file, url });
            setIsModelSwitchModalOpen(true);
        } else {
            executeSendMessage(prompt, images, file, url, undefined, isRetry);
        }
        if (!isRetry) {
            setImages([]);
            setFile(null);
            setInput('');
        }
    }, [selectedChatModel, executeSendMessage, isCodeRelated]);

    const handleSendSuggestion = (suggestionText: string) => {
        setInput(suggestionText);
        handleSendMessageWrapper(suggestionText);
    };

    const handleConfirmSwitch = () => {
        if (!pendingPrompt) return;
        executeSendMessage(pendingPrompt.prompt, pendingPrompt.images, pendingPrompt.file, pendingPrompt.url, 'gemini-2.5-pro');
        setIsModelSwitchModalOpen(false);
        setPendingPrompt(null);
        setImages([]);
        setFile(null);
        setInput('');
    };

    const handleDeclineSwitch = () => {
        if (!pendingPrompt) return;
        executeSendMessage(pendingPrompt.prompt, pendingPrompt.images, pendingPrompt.file, pendingPrompt.url);
        setIsModelSwitchModalOpen(false);
        setPendingPrompt(null);
        setImages([]);
        setFile(null);
        setInput('');
    };

    const handleRetry = useCallback(() => {
        if (!activeConversation || activeConversation.messages.length === 0) return;

        let lastModelMessageIndex = -1;
        for (let i = activeConversation.messages.length - 1; i >= 0; i--) {
            if (activeConversation.messages[i].role === 'model') {
                lastModelMessageIndex = i;
                break;
            }
        }

        if (lastModelMessageIndex !== -1) {
            const lastUserMessage = activeConversation.messages[lastModelMessageIndex - 1];
            if (lastUserMessage?.role === 'user') {
                conversationManager.updateConversationMessages(activeConversation.id, prev => prev.slice(0, lastModelMessageIndex));
                handleSendMessageWrapper(lastUserMessage.content, lastUserMessage.images, lastUserMessage.file, lastUserMessage.url, true);
            }
        }
    }, [activeConversation, conversationManager, handleSendMessageWrapper]);

    const handleEditMessage = (index: number, newContent: string) => {
        if (!activeConversation) return;
        
        const messageToEdit = activeConversation.messages[index];
        if (messageToEdit.role !== 'user') return;
        
        conversationManager.updateConversationMessages(activeConversation.id, prev => prev.slice(0, index));
        handleSendMessageWrapper(newContent, messageToEdit.images, messageToEdit.file, messageToEdit.url);
    };
    
    const onConfirmCancelStream = () => {
        handleCancelStream();
        setIsStopConfirmOpen(false);
    };

    const handleRequestCancelStream = () => {
        if (chatHandler.isLoading) {
            setIsStopConfirmOpen(true);
        }
    };

    const handleToolChange = (tool: Tool) => {
        setSelectedTool(tool);
        if (tool === 'translator') {
            setCurrentView('translator');
        } else {
            if (currentView === 'translator') {
                setCurrentView('chat');
            }
        }
    };

    const handleTranslationComplete = useCallback((tokens: { input: number, output: number }) => {
        setTranslatorUsage(prev => ({
            input: prev.input + tokens.input,
            output: prev.output + tokens.output,
        }));
        addTokenLog({
            source: 'Translator',
            inputTokens: tokens.input,
            outputTokens: tokens.output,
        });
    }, [addTokenLog]);
    
    const handleViewUsageDetails = (conversationId: string) => {
        setViewingUsageConvoId(conversationId);
        setCurrentView('usage-detail');
    };

    const handleViewConvoDetails = (convoPair: { user: ChatMessage; model: ChatMessage; serialNumber: number }) => {
        setViewingConvo(convoPair);
        setCurrentView('convo-detail');
    };
    
    const handleStartEditImage = (image: { index: number; base64: string; mimeType: string; }) => {
        setImageToEdit(image);
        setCurrentView('image-editor');
    };

    const handleSaveEditedImage = (newBase64: string) => {
        if (imageToEdit === null) return;
        setImages(prev => {
            const newImages = [...prev];
            newImages[imageToEdit.index] = { base64: newBase64, mimeType: 'image/jpeg' };
            return newImages;
        });
        setImageToEdit(null);
        setCurrentView('chat');
    };
    
    const handleOpenFullScreenEditor = () => {
        setCurrentView('editor');
    };

    const handleSaveEditor = (newText: string) => {
        setInput(newText);
        setCurrentView('chat');
    };

    const onToggleSelectionMode = useCallback(() => {
        setIsSelectionMode(prev => !prev);
        setSelectedMessageIds(new Set());
    }, []);

    const handleToggleMessageSelection = (userMessageId: string) => {
        setSelectedMessageIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userMessageId)) {
                newSet.delete(userMessageId);
            } else {
                newSet.add(userMessageId);
            }
            return newSet;
        });
    };

    const handleDeleteSelected = () => {
        if (selectedMessageIds.size > 0) {
            setIsDeleteConfirmOpen(true);
        }
    };

    const onConfirmDelete = () => {
        if (!activeConversation) return;
        conversationManager.updateConversationMessages(activeConversation.id, prevMessages => {
            const messagesToDelete = new Set<string>();
            selectedMessageIds.forEach(userMsgId => {
                const userMsgIndex = prevMessages.findIndex(m => m.id === userMsgId);
                if (userMsgIndex !== -1) {
                    messagesToDelete.add(userMsgId);
                    if (userMsgIndex + 1 < prevMessages.length && prevMessages[userMsgIndex + 1].role === 'model') {
                        messagesToDelete.add(prevMessages[userMsgIndex + 1].id);
                    }
                }
            });
            return prevMessages.filter(m => !messagesToDelete.has(m.id));
        });
        setIsSelectionMode(false);
        setSelectedMessageIds(new Set());
        setIsDeleteConfirmOpen(false);
    };

    const handleMaximizeMoleculeViewer = (molecule: MoleculeData) => {
        setMoleculeForFullScreen(molecule);
        setCurrentView('molecule-viewer');
    };

    const handleMaximizeOrbitalViewer = (orbital: OrbitalData) => {
        setOrbitalForFullScreen(orbital);
        setCurrentView('orbital-viewer');
    };
    
    const handleViewSources = (sources: GroundingChunk[]) => {
        setSourcesForViewer(sources);
    };

    const showConsoleToggleButton = consoleMode === 'manual' || (consoleMode === 'auto' && logs.length > 0);

    return (
        <>
            <div className="relative flex flex-col h-screen bg-[#F9F6F2] dark:bg-transparent text-neutral-800 dark:text-white transition-colors duration-300 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    {isDarkMode ? <ParticleUniverse /> : <Globe />}
                </div>

                <Header
                    onShowMemory={() => setCurrentView('memory')}
                    onShowUsage={() => setCurrentView('usage')}
                    onShowStorage={() => setCurrentView('storage')}
                    isChatView={currentView === 'chat'}
                    consoleMode={consoleMode}
                    setConsoleMode={setConsoleMode}
                    onOpenHistory={() => setIsHistorySheetOpen(true)}
                    conversationCount={conversationManager.conversations.length}
                    isSelectionMode={isSelectionMode}
                    onToggleSelectionMode={onToggleSelectionMode}
                    hasActiveConversation={!!activeConversation && activeConversation.messages.length > 0}
                />

                <ViewRenderer
                    currentView={currentView}
                    showWelcomeScreen={showWelcomeScreen}
                    activeConversation={activeConversation}
                    conversations={conversationManager.conversations}
                    isLoading={chatHandler.isLoading}
                    isThinking={chatHandler.isThinking}
                    isSearchingWeb={chatHandler.isSearchingWeb}
                    ltm={ltm}
                    translatorUsage={translatorUsage}
                    handleRetry={handleRetry}
                    handleEditMessage={handleEditMessage}
                    handleSelectSuggestion={handleSelectSuggestion}
                    handleCancelStream={handleCancelStream}
                    setCurrentView={setCurrentView}
                    setLtm={setLtm}
                    scrollContainerRef={scrollContainerRef}
                    onCloseTranslator={() => {
                        setSelectedTool('smart');
                        setCurrentView('chat');
                    }}
                    onTranslationComplete={handleTranslationComplete}
                    setModalImage={setModalImage}
                    setCodeForPreview={setCodeForPreview}
                    viewingUsageConvoId={viewingUsageConvoId}
                    onViewUsageDetails={handleViewUsageDetails}
                    viewingConvo={viewingConvo}
                    onViewConvoDetails={handleViewConvoDetails}
                    onSaveEditor={handleSaveEditor}
                    editorInitialText={input}
                    onSaveEditedImage={handleSaveEditedImage}
                    imageToEdit={imageToEdit}
                    isSelectionMode={isSelectionMode}
                    selectedMessageIds={selectedMessageIds}
                    onToggleMessageSelection={handleToggleMessageSelection}
                    moleculeForFullScreen={moleculeForFullScreen}
                    onMaximizeMoleculeViewer={handleMaximizeMoleculeViewer}
                    orbitalForFullScreen={orbitalForFullScreen}
                    onMaximizeOrbitalViewer={handleMaximizeOrbitalViewer}
                    onViewSources={handleViewSources}
                />
                
                <div className="relative">
                    {isSelectionMode && selectedMessageIds.size > 0 && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 pb-2 z-30 pointer-events-none">
                            <div className="flex items-center justify-between gap-4 bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-md rounded-xl p-3 shadow-lg border border-neutral-200 dark:border-gray-700 w-full sm:w-auto sm:min-w-[300px] mx-auto pointer-events-auto">
                                <span className="font-semibold text-neutral-800 dark:text-gray-200 text-sm">{selectedMessageIds.size} turn{selectedMessageIds.size > 1 ? 's' : ''} selected</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedMessageIds(new Set())}
                                        className="px-3 py-1.5 text-sm font-semibold text-neutral-700 dark:text-gray-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-gray-700/60 transition-colors"
                                    >
                                        Deselect All
                                    </button>
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {currentView === 'chat' && !isSelectionMode && (
                        <div className="relative z-20 px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3 bg-white/5 dark:bg-black/5 backdrop-blur-sm border-t border-neutral-200/50 dark:border-white/10 rounded-tl-3xl rounded-tr-3xl">
                            <div className="max-w-4xl mx-auto relative">
                                {suggestions.length > 0 && !input && (
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
                                        {suggestions.map((suggestion, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleSendSuggestion(suggestion)}
                                                className="animate-fade-in-up flex-shrink-0 px-3 py-1.5 text-sm font-medium bg-neutral-100 dark:bg-[#2E2F33] text-neutral-700 dark:text-gray-300 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-700/70 transition-colors"
                                                style={{ animationDelay: `${index * 75}ms` }}
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <ChatInput
                                    onSendMessage={handleSendMessageWrapper}
                                    isLoading={chatHandler.isLoading}
                                    elapsedTime={elapsedTime}
                                    selectedTool={selectedTool}
                                    onToolChange={handleToolChange}
                                    activeSuggestion={activeSuggestion}
                                    onClearSuggestion={() => setActiveSuggestion(null)}
                                    onCancelStream={handleRequestCancelStream}
                                    models={models}
                                    selectedChatModel={selectedChatModel}
                                    onSelectChatModel={setSelectedChatModel}
                                    apiKey={apiKey}
                                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                                    showConversationJumper={!showWelcomeScreen && messageIndices.length > 1}
                                    onNavigate={handleNavigate}
                                    isAtStartOfConversation={isAtStart}
                                    isAtEndOfConversation={isAtEnd}
                                    images={images}
                                    setImages={setImages}
                                    file={file}
                                    setFile={setFile}
                                    setModalImage={setModalImage}
                                    onEditImage={handleStartEditImage}
                                    input={input}
                                    setInput={setInput}
                                    onOpenFullScreenEditor={handleOpenFullScreenEditor}
                                    codeKeywords={codeKeywords}
                                    englishWords={englishWords}
                                />
                            </div>
                        </div>
                    )}
                </div>
                
                {IS_DEV_CONSOLE_ENABLED && consoleMode !== 'disabled' && (
                    <>
                        {showConsoleToggleButton && !isConsoleOpen && !isDevConsoleVisible && (
                            <ConsoleToggleButton
                                onClick={() => setIsConsoleOpen(prev => !prev)}
                                errorCount={errorCount}
                                warningCount={warningCount}
                            />
                        )}
                        <DevConsole
                            isOpen={isConsoleOpen}
                            onClose={() => setIsConsoleOpen(false)}
                            mode={consoleMode}
                            logs={logs}
                            clearLogs={clearLogs}
                            onNavigateToAnalysis={() => setCurrentView('word-analysis')}
                        />
                    </>
                )}
            </div>
            
            <ModelSwitchModal
                isOpen={isModelSwitchModalOpen}
                onClose={() => {
                    setIsModelSwitchModalOpen(false);
                    setPendingPrompt(null);
                }}
                onConfirm={handleConfirmSwitch}
                onDecline={handleDeclineSwitch}
            />

            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onSetApiKey={handleSetApiKey}
                onClose={() => { if (apiKey) setIsApiKeyModalOpen(false); }}
                currentApiKey={apiKey}
            />

            <ChatHistorySheet
                isOpen={isHistorySheetOpen}
                onClose={() => setIsHistorySheetOpen(false)}
                conversations={sortedConversations}
                activeConversationId={conversationManager.activeConversationId}
                onSelectConversation={onSelectConversation}
                onNewChat={onNewChat}
                onRenameConversation={conversationManager.handleRenameConversation}
                onDeleteConversation={conversationManager.handleDeleteConversation}
                onPinConversation={conversationManager.handlePinConversation}
            />
            <ConfirmationModal
                isOpen={isStopConfirmOpen}
                onClose={() => setIsStopConfirmOpen(false)}
                onConfirm={onConfirmCancelStream}
                title="Stop Generation"
                message="Are you sure you want to stop generating the response?"
                confirmButtonText="Stop"
                confirmButtonVariant="danger"
            />

            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={onConfirmDelete}
                title="Delete Messages"
                message={`Are you sure you want to permanently delete these ${selectedMessageIds.size} message pairs? This action cannot be undone.`}
                confirmButtonText="Delete"
                confirmButtonVariant="danger"
            />
            
            {modalImage && <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />}
            
            {codeForPreview && (
                <CodePreviewModal
                    code={codeForPreview.code}
                    language={codeForPreview.language}
                    onClose={() => setCodeForPreview(null)}
                />
            )}
            
            {sourcesForViewer && (
                <SourceViewer 
                    sources={sourcesForViewer}
                    onClose={() => setSourcesForViewer(null)}
                />
            )}
        </>
    );
};

export default App;