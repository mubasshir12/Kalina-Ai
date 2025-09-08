import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Suggestion, Tool, ChatModel, ModelInfo, View, ConsoleMode, ChatMessage } from './types';
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
import { codeKeywords } from './utils/codeKeywords';
import { IS_DEV_CONSOLE_ENABLED } from './config';
import DevConsole from './components/DevConsole';
import ConsoleToggleButton from './components/ConsoleToggleButton';
import { useDebug } from './contexts/DebugContext';
import ParticleUniverse from './components/ParticleUniverse';
import Globe from './components/Globe';
import ImageModal from './components/ImageModal';
import CodePreviewModal from './components/CodePreviewModal';
import { useScrollSpy } from './hooks/useScrollSpy';

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
    const [pendingPrompt, setPendingPrompt] = useState<{ prompt: string; images?: { base64: string; mimeType: string; }[]; file?: { base64: string; mimeType: string; name: string; size: number; } } | null>(null);
    const [translatorUsage, setTranslatorUsage] = useState<{ input: number, output: number }>(() => {
        try {
            const storedUsage = localStorage.getItem('kalina_translator_usage');
            return storedUsage ? JSON.parse(storedUsage) : { input: 0, output: 0 };
        } catch (e) {
            console.error("Failed to parse translator usage from localStorage", e);
            return { input: 0, output: 0 };
        }
    });
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    
    // State for modals lifted from child components
    const [modalImage, setModalImage] = useState<string | null>(null);
    const [codeForPreview, setCodeForPreview] = useState<{ code: string; language: string; } | null>(null);

    // Dev Console State
    const { logs } = useDebug();
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [consoleMode, setConsoleMode] = useState<ConsoleMode>('auto');

    // State for Usage Detail Views
    const [viewingUsageConvoId, setViewingUsageConvoId] = useState<string | null>(null);
    const [viewingConvo, setViewingConvo] = useState<{ user: ChatMessage; model: ChatMessage; serialNumber: number } | null>(null);


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
        setActiveSuggestion
    });

    const { activeConversation, sortedConversations, handleNewChat, handleSelectConversation } = conversationManager;
    const { handleSendMessage, handleUpdateMessageContent, handleCancelStream, elapsedTime } = chatHandler;

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
        try {
            localStorage.setItem('kalina_translator_usage', JSON.stringify(translatorUsage));
        } catch (e) {
            console.error("Failed to save translator usage to localStorage", e);
        }
    }, [translatorUsage]);

    useEffect(() => {
        const storedApiKey = localStorage.getItem('kalina_api_key');
        if (storedApiKey) {
            try {
                initializeAiClient(storedApiKey);
                setApiKey(storedApiKey);
            } catch (e) {
                console.error("Failed to initialize with stored API key:", e);
                localStorage.removeItem('kalina_api_key');
                setIsApiKeyModalOpen(true);
            }
        } else {
            setIsApiKeyModalOpen(true);
        }
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
            localStorage.setItem('kalina_api_key', key);
            setApiKey(key);
            setIsApiKeyModalOpen(false);
        } catch (e) {
            console.error("Failed to set API key:", e);
        }
    };

    const isCodeRelated = (text: string): boolean => {
        if (!text) return false;
        const lowerText = text.toLowerCase();
        return codeKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    };

    const executeSendMessage = useCallback((prompt: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; size: number; }, overrideModel?: ChatModel, isRetry = false) => {
        const convo = conversationManager.conversations.find(c => c.id === conversationManager.activeConversationId);
        const isFirstMessage = !convo || convo.messages.length === 0;

        handleSendMessage(prompt, images, file, overrideModel, isRetry);

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

    const handleSendMessageWrapper = useCallback((prompt: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; size: number; }, isRetry = false) => {
        if (selectedChatModel !== 'gemini-2.5-pro' && isCodeRelated(prompt) && !isRetry) {
            setPendingPrompt({ prompt, images, file });
            setIsModelSwitchModalOpen(true);
        } else {
            executeSendMessage(prompt, images, file, undefined, isRetry);
        }
    }, [selectedChatModel, executeSendMessage]);

    const handleConfirmSwitch = () => {
        if (!pendingPrompt) return;
        executeSendMessage(pendingPrompt.prompt, pendingPrompt.images, pendingPrompt.file, 'gemini-2.5-pro');
        setIsModelSwitchModalOpen(false);
        setPendingPrompt(null);
    };

    const handleDeclineSwitch = () => {
        if (!pendingPrompt) return;
        executeSendMessage(pendingPrompt.prompt, pendingPrompt.images, pendingPrompt.file);
        setIsModelSwitchModalOpen(false);
        setPendingPrompt(null);
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
                handleSendMessageWrapper(lastUserMessage.content, lastUserMessage.images, lastUserMessage.file, true);
            }
        }
    }, [activeConversation, conversationManager, handleSendMessageWrapper]);

    const handleEditMessage = (index: number, newContent: string) => {
        if (!activeConversation) return;
        
        const messageToEdit = activeConversation.messages[index];
        if (messageToEdit.role !== 'user') return;
        
        conversationManager.updateConversationMessages(activeConversation.id, prev => prev.slice(0, index));
        handleSendMessageWrapper(newContent, messageToEdit.images, messageToEdit.file);
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
    }, []);
    
    const handleViewUsageDetails = (conversationId: string) => {
        setViewingUsageConvoId(conversationId);
        setCurrentView('usage-detail');
    };

    const handleViewConvoDetails = (convoPair: { user: ChatMessage; model: ChatMessage; serialNumber: number }) => {
        setViewingConvo(convoPair);
        setCurrentView('convo-detail');
    };
    
    const showConsoleToggleButton = consoleMode === 'manual' || (consoleMode === 'auto' && logs.length > 0);

    return (
        <>
            <div className="relative flex flex-col h-[100dvh] bg-[#F9F6F2] dark:bg-transparent text-neutral-800 dark:text-white transition-colors duration-300 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    {isDarkMode ? <ParticleUniverse /> : <Globe />}
                </div>

                <Header
                    onShowMemory={() => setCurrentView('memory')}
                    onShowUsage={() => setCurrentView('usage')}
                    isChatView={currentView === 'chat'}
                    consoleMode={consoleMode}
                    setConsoleMode={setConsoleMode}
                    onOpenHistory={() => setIsHistorySheetOpen(true)}
                    conversationCount={conversationManager.conversations.length}
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
                    handleUpdateMessageContent={handleUpdateMessageContent}
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
                />

                {currentView === 'chat' && (
                    <div className="relative z-20 px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3 bg-white/5 dark:bg-black/5 backdrop-blur-sm border-t border-neutral-200/50 dark:border-white/10 rounded-tl-3xl rounded-tr-3xl">
                        <div className="max-w-4xl mx-auto relative">
                            
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
                            />
                        </div>
                    </div>
                )}
                
                {IS_DEV_CONSOLE_ENABLED && (
                    <>
                        {showConsoleToggleButton && (
                            <ConsoleToggleButton
                                onClick={() => setIsConsoleOpen(prev => !prev)}
                                errorCount={logs.length}
                            />
                        )}
                        <DevConsole
                            isOpen={isConsoleOpen}
                            onClose={() => setIsConsoleOpen(false)}
                            mode={consoleMode}
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
            
            {modalImage && <ImageModal imageUrl={modalImage} onClose={() => setModalImage(null)} />}
            
            {codeForPreview && (
                <CodePreviewModal
                    code={codeForPreview.code}
                    language={codeForPreview.language}
                    onClose={() => setCodeForPreview(null)}
                />
            )}
        </>
    );
};

export default App;