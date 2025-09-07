
import React, { useState, KeyboardEvent, useRef, ChangeEvent, useEffect } from 'react';
import { Suggestion, Tool, ChatModel, ModelInfo } from '../types';
import { Sparkles, ChevronDown, X, Paperclip, ArrowUp, Globe, BrainCircuit, Image, Expand, File, Presentation, FileText, Camera, Languages, Link, ClipboardPaste, ChevronUp } from 'lucide-react';
import ImageModal from './ImageModal';
import ModelSelector from './ModelSelector';
import { compressImage } from '../utils/imageCompressor';

interface ChatInputProps {
  onSendMessage: (message: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; size: number; }) => void;
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
}

const tools: { id: Tool; name: string; description: string; icon: React.ElementType }[] = [
    { id: 'smart', name: 'Smart Mode', description: 'Automatically uses the best tool for the job.', icon: Sparkles },
    { id: 'webSearch', name: 'Web Search', description: 'Searches the web for real-time info.', icon: Globe },
    { id: 'urlReader', name: 'URL Reader', description: 'Reads content from a web page URL.', icon: Link },
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
}) => {
  const [input, setInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [images, setImages] = useState<{ base64: string; mimeType: string; }[]>([]);
  const [file, setFile] = useState<{ base64: string; mimeType: string; name: string; size: number; } | null>(null);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const formatTime = (ms: number) => {
    if (!ms || ms < 0) return '0.0s';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height to recalculate
        const scrollHeight = textareaRef.current.scrollHeight;
        textareaRef.current.style.height = `${scrollHeight}px`; // Set to new scroll height
    }
  }, [input]);

  useEffect(() => {
    if (activeSuggestion) {
        setInput(activeSuggestion.prompt);
    }
  }, [activeSuggestion]);
  
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
    let messageToSend = input;
    if (selectedTool === 'urlReader' && urlInput.trim()) {
      messageToSend = `${urlInput.trim()}\n${input.trim()}`;
    }

    if ((messageToSend.trim() || images.length > 0 || file) && !isLoading) {
      onSendMessage(messageToSend, images.length > 0 ? images : undefined, file ?? undefined);
      setInput('');
      setUrlInput('');
      setImages([]);
      setFile(null);
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
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) setIsToolsOpen(false);
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target as Node)) setIsAttachmentMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const selectedToolObject = tools.find(t => t.id === selectedTool) || tools[0];
  const SelectedIcon = selectedToolObject.icon;
  
  const placeholderText = () => {
      if (selectedTool === 'urlReader') return "Ask a question about the URL above...";
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
  const isSendActionDisabled = isProcessingAttachment || (images.length === 0 && !file && !input.trim() && (selectedTool !== 'urlReader' || !urlInput.trim()));

  return (
    <>
      {previewModalImage && (
          <ImageModal 
              imageUrl={previewModalImage} 
              onClose={() => setPreviewModalImage(null)}
          />
      )}
      <div className="flex flex-col gap-2">
           {/* Hidden file inputs */}
          <input ref={cameraInputRef} type="file" capture="user" accept="image/*" onChange={handleFileChange} className="hidden" />
          <input ref={imageInputRef} type="file" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} className="hidden" multiple />
          <input ref={fileInputRef} type="file" accept="application/pdf, text/plain" onChange={handleFileChange} className="hidden" />
          
          <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="relative" ref={toolsMenuRef}>
                    <button onClick={() => setIsToolsOpen(!isToolsOpen)} className="flex items-center gap-2 px-3 py-1.5 text-neutral-700 dark:text-gray-300 bg-neutral-100 dark:bg-[#2E2F33] border border-neutral-300 dark:border-gray-600 rounded-xl hover:bg-neutral-200 dark:hover:bg-gray-700/70 transition-colors">
                        <SelectedIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                        <span className={`font-medium leading-none transition-all duration-200 ${showConversationJumper ? 'text-xs' : 'text-sm'}`}>{selectedToolObject.name}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isToolsOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isToolsOpen && (
                        <div className="absolute bottom-full mb-2 w-72 bg-white dark:bg-[#2E2F33] border border-neutral-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-20">
                            {tools.map(tool => (
                                <button key={tool.id} onClick={() => { onToolChange(tool.id); setIsToolsOpen(false); }} className="w-full text-left p-3 text-neutral-800 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors flex items-center gap-3">
                                    <tool.icon className="h-5 w-5 text-neutral-500 dark:text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-sm">{tool.name}</p>
                                        <p className="text-xs text-neutral-500 dark:text-gray-400">{tool.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
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

          <div onClick={handleContainerClick} className="bg-neutral-200 dark:bg-[#202123] rounded-t-3xl rounded-b-3xl px-3 pt-4 pb-3 flex flex-col justify-between min-h-[5rem] cursor-text">
            <div className="flex-1">
                 <textarea ref={textareaRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} onPaste={handlePaste} placeholder={placeholderText()} disabled={isLoading} className="w-full bg-transparent text-neutral-800 dark:text-gray-200 placeholder:text-neutral-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 transition-all duration-300 disabled:opacity-50 resize-none max-h-[8rem] overflow-y-auto scrollbar-hide cursor-text" />
            </div>
            <div className="flex justify-between items-end mt-2">
                <div className="flex items-end">
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
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                            <button onClick={() => setPreviewModalImage(`data:${image.mimeType};base64,${image.base64}`)} className="p-1.5 bg-white/20 text-white rounded-full backdrop-blur-sm hover:bg-white/30" aria-label="Zoom image">
                                                <Expand className="h-5 w-5" />
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
                </div>

                <button onClick={isLoading ? onCancelStream : handleSend} disabled={isLoading ? false : isSendActionDisabled} className={`flex items-center justify-center transition-all duration-300 ${isLoading ? 'bg-red-600 hover:bg-red-500 h-10 rounded-full' : 'bg-black dark:bg-white text-white dark:text-black disabled:bg-neutral-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed w-10 h-10 rounded-full'}`} aria-label={isLoading ? `Stop generating (${formatTime(elapsedTime)})` : "Send message"}>
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
