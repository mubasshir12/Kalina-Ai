


import React, { useState, KeyboardEvent, useRef, ChangeEvent, useEffect } from 'react';
import { Suggestion, Tool, ChatModel, ModelInfo } from '../types';
import { Sparkles, ChevronDown, X, Paperclip, ArrowUp, Globe, BrainCircuit, Image, Expand, File, Presentation, FileText, Camera, Languages, Link, ClipboardPaste, ChevronUp, Mic, FlaskConical, Pencil, Maximize2, BotMessageSquare, Wand2, LoaderCircle } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { compressImage } from '../utils/imageCompressor';
import Tooltip from './Tooltip';
import ToolSelectionModal from './ToolSelectionModal';
import { enhancePrompt } from '../services/chatService';

// Add type definitions for the Web Speech API to resolve TypeScript errors for SpeechRecognition and SpeechRecognitionEvent.
interface SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: () => void;
    onend: () => void;
    onerror: (event: { error: string }) => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    start: () => void;
    stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
    readonly length: number;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
}

type KeywordSuggestion = {
    text: string;
    type: 'code' | 'english';
}

interface ChatInputProps {
  // FIX: Changed 'file' parameter to accept a single file object or undefined, not an array.
  onSendMessage: (message: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; size: number; }, url?: string) => void;
  isLoading: boolean;
  elapsedTime: number;
  selectedTool: Tool;
  onToolChange: (tool: Tool) => void;
  activeSuggestion: Suggestion | null;
  onClearSuggestion: () => void;
  onCancelStream: () => void;
  models: ModelInfo[];
  selectedChatModel: ChatModel;
  onSelectChatModel: (model: ChatModel) => void;
  apiKey: string | null;
  onOpenApiKeyModal: () => void;
  showConversationJumper: boolean;
  onNavigate: (direction: 'up' | 'down') => void;
  isAtStartOfConversation: boolean;
  isAtEndOfConversation: boolean;
  images: { base64: string; mimeType: string; }[];
  setImages: React.Dispatch<React.SetStateAction<{ base64: string; mimeType: string; }[]>>;
  file: { base64: string; mimeType: string; name: string; size: number; } | null;
  setFile: React.Dispatch<React.SetStateAction<{ base64: string; mimeType: string; name: string; size: number; } | null>>;
  setModalImage: (url: string | null) => void;
  onEditImage: (image: { index: number; base64: string; mimeType: string; }) => void;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onOpenFullScreenEditor: () => void;
  codeKeywords: string[];
  englishWords: string[];
}

export const tools: { id: Tool; name: string; description: string; icon: React.ElementType }[] = [
    { id: 'smart', name: 'Smart Mode', description: 'Automatically uses the best tool for the job.', icon: Sparkles },
    { id: 'multi-agent', name: 'Multi-Agent', description: 'Use a team of AI agents for a detailed response.', icon: BotMessageSquare },
    { id: 'webSearch', name: 'Web Search', description: 'Searches the web for real-time info.', icon: Globe },
    { id: 'urlReader', name: 'URL Reader', description: 'Reads content from a web page URL.', icon: Link },
    { id: 'chemistry', name: 'Chemistry', description: 'Visualize molecules and solve chemistry problems.', icon: FlaskConical },
    { id: 'thinking', name: 'Thinking', description: 'Shows the AI\'s step-by-step thought process.', icon: BrainCircuit },
    { id: 'translator', name: 'Translator', description: 'Translates text between languages.', icon: Languages },
];

const FileIcon: React.FC<{ mimeType: string; className?: string; }> = ({ mimeType, className = "h-6 w-6" }) => {
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return <Presentation className={`${className} text-orange-500 dark:text-orange-400`} />;
    }
    if (mimeType.includes('pdf')) {
        return <FileText className={`${className} text-red-500 dark:text-red-400`} />;
    }
    if (mimeType.includes('plain')) {
        return <FileText className={`${className} text-blue-500 dark:text-blue-400`} />;
    }
    return <File className={`${className} text-neutral-500 dark:text-gray-400`} />;
};

const ChatInput: React.FC<ChatInputProps> = ({ 
    onSendMessage, 
    isLoading,
    elapsedTime,
    selectedTool,
    onToolChange,
    activeSuggestion,
    onClearSuggestion,
    onCancelStream,
    models,
    selectedChatModel,
    onSelectChatModel,
    apiKey,
    onOpenApiKeyModal,
    showConversationJumper,
    onNavigate,
    isAtStartOfConversation,
    isAtEndOfConversation,
    images,
    setImages,
    file,
    setFile,
    setModalImage,
    onEditImage,
    input,
    setInput,
    onOpenFullScreenEditor,
    codeKeywords,
    englishWords,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const [isMaxHeight, setIsMaxHeight] = useState(false);
  const [keywordSuggestions, setKeywordSuggestions] = useState<KeywordSuggestion[]>([]);
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const [isRefining, setIsRefining] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const formatTime = (ms: number) => {
    if (!ms || ms < 0) return '0.0s';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
        setIsSpeechSupported(true);
        const recognition: SpeechRecognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            setInput(prev => (prev ? prev.trim() + ' ' : '') + transcript);
        };

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognitionRef.current = recognition;
    }
  }, [setInput]);

  const handleToggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
    }
  };

  const handleRefine = async () => {
    if (!input.trim() || isRefining || isLoading) return;
    setIsRefining(true);
    try {
        const refinedPrompt = await enhancePrompt(input);
        setInput(refinedPrompt);
    } finally {
        setIsRefining(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height to recalculate
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`; // Set to new scroll height
        
        // max-h-[8rem] is 128px. Check if scrollHeight has reached or exceeded this.
        const maxHeight = 128;
        setIsMaxHeight(scrollHeight >= maxHeight);
    }
  }, [input]);

  useEffect(() => {
    if (activeSuggestion) {
        setInput(activeSuggestion.prompt);
    }
  }, [activeSuggestion, setInput]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = event.target.files;
        if (!selectedFiles || selectedFiles.length === 0) return;

        const imageFiles = Array.from(selectedFiles).filter(f => f.type.startsWith('image/'));
        const otherFiles = Array.from(selectedFiles).filter(f => !f.type.startsWith('image/'));

        // Handle image files (up to 3)
        if (imageFiles.length > 0) {
            setIsProcessingAttachment(true);
            const filesToAdd = imageFiles.slice(0, 3 - images.length);
            if (filesToAdd.length === 0) {
                // TODO: Add user feedback that the image limit is reached.
                setIsProcessingAttachment(false);
                return;
            }

            const imagePromises = filesToAdd.map(file => 
                new Promise<{ base64: string, mimeType: string }>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64String = (reader.result as string).split(',')[1];
                        try {
                            const compressed = await compressImage(base64String, file.type);
                            resolve(compressed);
                        } catch (error) {
                            console.error("Failed to compress image:", error);
                            resolve({ base64: base64String, mimeType: file.type });
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                })
            );

            Promise.all(imagePromises)
                .then(newImages => setImages(prev => [...prev, ...newImages]))
                .catch(console.error)
                .finally(() => setIsProcessingAttachment(false));
            
            setFile(null); // Clear file if images are added
        } 
        // Handle single non-image file
        else if (otherFiles.length > 0) {
            const selectedFile = otherFiles[0];
            setIsProcessingAttachment(true);
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setFile({
                    base64: base64String,
                    mimeType: selectedFile.type,
                    name: selectedFile.name,
                    size: selectedFile.size,
                });
                setImages([]); // Clear images if a file is added
                setIsProcessingAttachment(false);
            };
            reader.readAsDataURL(selectedFile);
        }

        if (event.target) {
            event.target.value = '';
        }
    };

  const handleSend = () => {
    const messageToSend = input.trim();
    const urlToSend = selectedTool === 'urlReader' ? urlInput.trim() : undefined;

    if ((messageToSend || images.length > 0 || file || urlToSend) && !isLoading) {
      onSendMessage(messageToSend, images.length > 0 ? images : undefined, file ?? undefined, urlToSend);
      setUrlInput('');
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (event.key === 'Enter' && !event.shiftKey && !isMobile) {
        event.preventDefault();
        handleSend();
    }
  };

  const removeImage = (indexToRemove: number) => {
      setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  }
  
  const removeFile = () => {
      setFile(null);
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (images.length >= 3) return; // Prevent pasting if limit is reached
    const pastedFile = Array.from(event.clipboardData.files).find(f => f.type.startsWith('image/'));
    if (pastedFile) {
      event.preventDefault();
      setIsProcessingAttachment(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
         try {
          const compressedImage = await compressImage(base64String, pastedFile.type);
          setImages(prev => [...prev, compressedImage]);
        } catch (error) {
          console.error("Failed to compress pasted image:", error);
          setImages(prev => [...prev, { base64: base64String, mimeType: pastedFile.type }]);
        } finally {
          setIsProcessingAttachment(false);
        }
      };
      reader.readAsDataURL(pastedFile);
    }
  }

  const handlePasteUrl = async () => {
    try {
        const text = await navigator.clipboard.readText();
        setUrlInput(text);
    } catch (error) {
        console.error('Failed to read clipboard contents: ', error);
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) setIsAttachmentMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
    useEffect(() => {
        if (!input.trim() || isLoading || activeSuggestion || (codeKeywords.length === 0 && englishWords.length === 0)) {
            setKeywordSuggestions([]);
            return;
        }

        const lastWordRegex = /[\w.]+$/;
        const match = input.match(lastWordRegex);
        const lastWord = match ? match[0].toLowerCase() : '';

        if (!lastWord || lastWord.length < 2) {
            setKeywordSuggestions([]);
            return;
        }

        const codeSuggestions = codeKeywords
            .filter(k => k.toLowerCase().startsWith(lastWord) && k.toLowerCase() !== lastWord)
            .map(k => ({ text: k, type: 'code' as const }));

        const englishSuggestions = englishWords
            .filter(k => k.toLowerCase().startsWith(lastWord) && k.toLowerCase() !== lastWord)
            .map(k => ({ text: k, type: 'english' as const }));

        const combined = [...codeSuggestions, ...englishSuggestions];
        const uniqueMap = new Map<string, KeywordSuggestion>();
        combined.forEach(item => {
            if (!uniqueMap.has(item.text)) {
                uniqueMap.set(item.text, item);
            }
        });

        const uniqueSuggestions = Array.from(uniqueMap.values()).slice(0, 7);
        setKeywordSuggestions(uniqueSuggestions);

    }, [input, isLoading, activeSuggestion, codeKeywords, englishWords]);

    const handleKeywordClick = (keyword: string) => {
        const lastWordRegex = /[\w.]+$/;
        const match = input.match(lastWordRegex);

        if (match && typeof match.index === 'number') {
            const newInput = input.substring(0, match.index) + keyword + ' ';
            setInput(newInput);
        } else {
            setInput(input + keyword + ' ');
        }

        setKeywordSuggestions([]);
        textareaRef.current?.focus();
    };

  const placeholderText = () => {
      if (isRefining) return "Refining your prompt...";
      if (isLoading) return "Processing...";
      if (isListening) return "Listening...";
      if (selectedTool === 'urlReader') return "Ask a question about the URL above...";
      if (selectedTool === 'multi-agent') return `Ask a question for the multi-agent system...`;
      if (images.length > 0) return `Ask a question about the ${images.length} image(s)...`;
      if (file) return `Ask a question about ${file.name}...`;
      return "Ask me anything...";
  }

  const handleClearSuggestionWithInput = () => {
    onClearSuggestion();
    setInput('');
  }
  
  const handleTriggerInput = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
    setIsAttachmentMenuOpen(false);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || (attachmentMenuRef.current && attachmentMenuRef.current.contains(target))) return;
    textareaRef.current?.focus();
  };

  // The button should be disabled for sending if attachments are processing or if there's no content.
  const isSendDisabled = isRefining || isProcessingAttachment || (images.length === 0 && !file && !input.trim() && (selectedTool !== 'urlReader' || !urlInput.trim()));

  const MicButton = () => (
    <button
        onClick={handleToggleListening}
        disabled={isLoading || isRefining || !isSpeechSupported}
        className={`flex items-center justify-center w-10 h-10 p-2 rounded-full transition-all duration-200 ${
            isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'text-neutral-600 dark:text-gray-300 hover:bg-neutral-300/50 dark:hover:bg-gray-700/70'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={isListening ? "Stop listening" : "Start voice input"}
    >
        <Mic className="h-6 w-6" />
    </button>
  );

  return (
    <>
      <div className="flex flex-col gap-2">
           {/* Hidden file inputs */}
          <input ref={cameraInputRef} type="file" capture="user" accept="image/*" onChange={handleFileChange} className="hidden" />
          <input ref={imageInputRef} type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="hidden" multiple />
          <input ref={fileInputRef} type="file" accept="application/pdf, text/plain" onChange={handleFileChange} className="hidden" />
          
          <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <ToolSelectionModal 
                    selectedTool={selectedTool}
                    onToolChange={onToolChange}
                    isJumperVisible={showConversationJumper}
                />
                 <ModelSelector models={models} selectedChatModel={selectedChatModel} onSelectChatModel={onSelectChatModel} apiKey={apiKey} onOpenApiKeyModal={onOpenApiKeyModal} isJumperVisible={showConversationJumper} />
              </div>
              <div className="flex items-center gap-2">
                 {showConversationJumper && (
                    <>
                        <button onClick={(e) => { e.preventDefault(); if ('vibrate' in navigator) navigator.vibrate(20); onNavigate('up'); }} disabled={isLoading || isAtStartOfConversation} className="flex items-center justify-center w-10 h-10 text-neutral-700 dark:text-gray-300 bg-neutral-100 dark:bg-[#2E2F33] border border-neutral-300 dark:border-gray-600 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-700/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Jump to previous message">
                            <ChevronUp className="h-5 w-5" />
                        </button>
                        <button onClick={(e) => { e.preventDefault(); if ('vibrate' in navigator) navigator.vibrate(20); onNavigate('down'); }} disabled={isLoading || isAtEndOfConversation} className="flex items-center justify-center w-10 h-10 text-neutral-700 dark:text-gray-300 bg-neutral-100 dark:bg-[#2E2F33] border border-neutral-300 dark:border-gray-600 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-700/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Jump to next message">
                            <ChevronDown className="h-5 w-5" />
                        </button>
                    </>
                )}
              </div>
          </div>
          
          {activeSuggestion && (
            <div className="p-2 pl-3 bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-xl flex self-start items-center gap-2 text-sm">
              {activeSuggestion.icon}
              <span className="text-amber-800 dark:text-amber-200 line-clamp-1 font-medium">{activeSuggestion.text}</span>
              <button onClick={handleClearSuggestionWithInput} className="p-1.5 rounded-full text-amber-500 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-800/60 transition-colors flex-shrink-0" aria-label="Clear suggestion">
                  <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {selectedTool === 'urlReader' && (
            <div className="relative">
                <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Enter a URL to read..." className="w-full bg-neutral-100 dark:bg-[#2E2F33] border border-neutral-300 dark:border-gray-600 rounded-lg py-2.5 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-800 dark:text-gray-200" disabled={isLoading} />
                <button onClick={handlePasteUrl} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neutral-500 dark:text-gray-400 hover:bg-neutral-200 dark:hover:bg-gray-700/70 rounded-full transition-colors" aria-label="Paste URL" disabled={isLoading}>
                    <ClipboardPaste className="h-5 w-5" />
                </button>
            </div>
          )}

          <div onClick={handleContainerClick} className="relative bg-neutral-200 dark:bg-[#202123] rounded-t-3xl rounded-b-3xl px-3 pt-4 pb-3 flex flex-col justify-between min-h-[5rem] cursor-text">
            {isMaxHeight && (
              <Tooltip content="Full Screen Editor">
                  <button
                      onClick={onOpenFullScreenEditor}
                      className="absolute top-2 right-3 p-1.5 rounded-full bg-black/10 dark:bg-white/10 backdrop-blur-sm text-neutral-600 dark:text-gray-300 hover:bg-black/20 dark:hover:bg-white/20 transition-all z-10"
                      aria-label="Open full screen editor"
                  >
                      <Maximize2 className="h-5 w-5" />
                  </button>
              </Tooltip>
            )}
             {keywordSuggestions.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-hide">
                  {keywordSuggestions.map((suggestion, index) => (
                      <button
                          key={index}
                          onClick={() => handleKeywordClick(suggestion.text)}
                          className={`animate-fade-in-up flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                            suggestion.type === 'code'
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/60'
                                : 'bg-neutral-100 dark:bg-[#2E2F33] text-neutral-700 dark:text-gray-300 hover:bg-neutral-200 dark:hover:bg-gray-700/70'
                          }`}
                          style={{ animationDelay: `${index * 50}ms` }}
                      >
                          {suggestion.text}
                      </button>
                  ))}
              </div>
            )}
            <div className="flex-1">
                 <textarea ref={textareaRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} onPaste={handlePaste} placeholder={placeholderText()} disabled={isLoading || isRefining} className="w-full bg-transparent text-neutral-800 dark:text-gray-200 placeholder:text-neutral-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 transition-all duration-300 disabled:opacity-50 resize-none max-h-[8rem] overflow-y-auto scrollbar-hide cursor-text" />
            </div>
            <div className="flex justify-between items-end mt-2">
                <div className="flex items-end gap-2">
                    {isProcessingAttachment ? (
                        <div className="flex items-center justify-center w-10 h-10">
                            <div className="w-6 h-6 border-2 border-neutral-400 border-t-amber-500 rounded-full animate-spin"></div>
                        </div>
                    ) : (images.length === 0 && !file) ? (
                        <div className="flex items-center">
                            <div ref={attachmentMenuRef} className="relative">
                                <button onClick={() => setIsAttachmentMenuOpen(prev => !prev)} disabled={isLoading || images.length >= 3} className="flex items-center justify-center w-10 h-10 p-2 rounded-full text-neutral-600 dark:text-gray-300 hover:bg-neutral-300/50 dark:hover:bg-gray-700/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Attach file">
                                    <Paperclip className="h-6 w-6" />
                                </button>
                                {isAttachmentMenuOpen && (
                                  <div className="absolute bottom-full mb-2 w-48 bg-white dark:bg-[#2E2F33] border border-neutral-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden">
                                      <button onClick={() => handleTriggerInput(cameraInputRef)} className="w-full flex items-center gap-3 p-2.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors">
                                          <Camera className="w-4 h-4" /> Take Photo
                                      </button>
                                      <button onClick={() => handleTriggerInput(imageInputRef)} className="w-full flex items-center gap-3 p-2.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors">
                                          <Image className="w-4 h-4" /> Upload Image(s)
                                      </button>
                                      <button onClick={() => handleTriggerInput(fileInputRef)} className="w-full flex items-center gap-3 p-2.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors">
                                          <File className="w-4 h-4" /> Upload File
                                      </button>
                                  </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {images.map((image, index) => (
                                <div key={index} className="relative flex-shrink-0">
                                    <div className="w-14 h-14 rounded-xl relative group bg-neutral-200 dark:bg-gray-800 ring-2 ring-amber-500">
                                        <img src={`data:${image.mimeType};base64,${image.base64}`} alt="Image preview" className="w-full h-full object-cover rounded-xl" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1">
                                            <button onClick={() => setModalImage(`data:${image.mimeType};base64,${image.base64}`)} className="p-1.5 bg-white/20 text-white rounded-full backdrop-blur-sm hover:bg-white/30" aria-label="Zoom image">
                                                <Expand className="h-4 w-4" />
                                            </button>
                                            <button onClick={() => onEditImage({ index, ...image })} className="p-1.5 bg-white/20 text-white rounded-full backdrop-blur-sm hover:bg-white/30" aria-label="Edit image">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => removeImage(index)} className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors z-10" aria-label="Remove image">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {file && (
                                <div className="relative flex-shrink-0">
                                    <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center p-1 text-center bg-neutral-200 dark:bg-gray-800 ring-2 ring-amber-500">
                                        <FileIcon mimeType={file.mimeType} className="h-5 w-5" />
                                        <p className="text-xs text-neutral-500 dark:text-gray-400 truncate w-full mt-1">{file.name}</p>
                                    </div>
                                    <button onClick={removeFile} className="absolute -top-1.5 -right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-500 transition-colors z-10" aria-label="Remove file">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {selectedTool === 'multi-agent' && (
                        <Tooltip content="Refine prompt with AI">
                            <button
                                onClick={handleRefine}
                                disabled={isLoading || isRefining || !input.trim()}
                                className="flex items-center justify-center w-10 h-10 p-2 rounded-full text-neutral-600 dark:text-gray-300 hover:bg-neutral-300/50 dark:hover:bg-gray-700/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Refine prompt"
                            >
                                {isRefining ? <LoaderCircle className="h-6 w-6 animate-spin" /> : <Wand2 className="h-6 w-6" />}
                            </button>
                        </Tooltip>
                    )}
                    {isSpeechSupported ? <MicButton /> : (
                        <Tooltip content="Voice input is not supported on this browser.">
                             <div className="flex items-center justify-center w-10 h-10">
                                <MicButton />
                            </div>
                        </Tooltip>
                    )}
                </div>

                <button onClick={isLoading ? onCancelStream : handleSend} disabled={isLoading ? false : isSendDisabled} className={`flex items-center justify-center transition-all duration-300 ${isLoading ? 'bg-red-600 hover:bg-red-500 h-10 rounded-full' : 'bg-black dark:bg-white text-white dark:text-black disabled:bg-neutral-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed w-10 h-10 rounded-full'}`} aria-label={isLoading ? `Stop generating (${formatTime(elapsedTime)})` : "Send message"}>
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2 px-3 text-white w-full">
                          <div className="relative w-6 h-6">
                              <div className="w-full h-full animate-spin" style={{ borderRadius: '50%', border: '2px solid white', borderTopColor: 'transparent' }} />
                              <div className="absolute inset-0 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-white" /></div>
                          </div>
                          <span className="text-sm font-mono font-semibold">{formatTime(elapsedTime)}</span>
                      </div>
                    ) : (
                      <ArrowUp className="h-6 w-6" />
                    )}
                </button>
            </div>
          </div>
      </div>
    </>
  );
};

export default ChatInput;