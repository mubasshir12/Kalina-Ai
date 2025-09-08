
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage as ChatMessageType } from '../../types';
import { X, Copy, Check, Pencil, File, FileText, Presentation, Link } from 'lucide-react';
import ImageAnalysisAnimation from '../ImageAnalysisAnimation';
import FileAnalysisAnimation from '../FileAnalysisAnimation';

const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/^#+\s/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[\d+\]/g, '')
    .trim();
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes < k) {
        return `${bytes} ${sizes[0]}`;
    }
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const FileIcon: React.FC<{ mimeType: string }> = ({ mimeType }) => {
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return <Presentation className="h-5 w-5 flex-shrink-0" />;
    }
    if (mimeType.includes('pdf')) {
        return <FileText className="h-5 w-5 flex-shrink-0" />;
    }
    if (mimeType.includes('plain')) {
        return <FileText className="h-5 w-5 flex-shrink-0" />;
    }
    return <File className="h-5 w-5 flex-shrink-0" />;
};

const truncateFileName = (fullName: string, maxLength: number = 20): string => {
    if (fullName.length <= maxLength) {
        return fullName;
    }
    const extensionIndex = fullName.lastIndexOf('.');
    const extension = extensionIndex !== -1 ? fullName.substring(extensionIndex) : '';
    const name = extensionIndex !== -1 ? fullName.substring(0, extensionIndex) : fullName;

    const charsToKeep = maxLength - extension.length - 3; // 3 for "..."
    if (charsToKeep <= 0) {
        return `...${extension}`;
    }

    const truncatedName = name.substring(0, charsToKeep);
    return `${truncatedName}...${extension}`;
};


interface UserMessageProps extends ChatMessageType {
    onEditMessage?: (index: number, newContent: string) => void;
    setModalImage: (url: string | null) => void;
    index: number;
}

const UserMessage: React.FC<UserMessageProps> = ({ 
    content, 
    images, 
    file,
    url,
    isAnalyzingImage,
    analysisCompleted,
    isAnalyzingFile,
    index, 
    onEditMessage,
    setModalImage
}) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isCopied, setIsCopied] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [analyzingIndex, setAnalyzingIndex] = useState(0);
  const analysisIntervalRef = useRef<number | null>(null);

  const totalImages = images ? images.length : 0;

  useEffect(() => {
    const handleClickOutside = () => {
      if (isMenuVisible) setIsMenuVisible(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuVisible]);

  useEffect(() => {
    if (isAnalyzingImage && totalImages > 0) {
        setAnalyzingIndex(0);
        setCurrentIndex(0);

        if (totalImages > 1) {
            analysisIntervalRef.current = window.setInterval(() => {
                setAnalyzingIndex(prev => {
                    const nextIndex = prev + 1;
                    if (nextIndex < totalImages) {
                        setCurrentIndex(nextIndex);
                        return nextIndex;
                    }
                    if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
                    return prev;
                });
            }, 2500);
        }
    } else {
        if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    }
    return () => { if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current); };
  }, [isAnalyzingImage, totalImages]);


  const handlePressStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    pressTimer.current = setTimeout(() => {
        if ('vibrate' in navigator) navigator.vibrate(20);
        setIsMenuVisible(true);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  
  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(stripMarkdown(content));
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    setIsMenuVisible(false);
  };

  const handleEdit = () => {
      setIsEditing(true);
      setIsMenuVisible(false);
  };

  const handleCancelEdit = () => {
      setIsEditing(false);
      setEditedContent(content);
  };

  const handleSaveEdit = () => {
      if (typeof index === 'number' && onEditMessage && editedContent.trim()) {
          onEditMessage(index, editedContent);
          setIsEditing(false);
      }
  };
  
  const messageId = `message-${index}`;
  
  if (isEditing) {
      return (
          <div id={messageId} className="flex justify-end">
              <div className="w-full max-w-[280px] sm:max-w-2xl p-4 rounded-2xl bg-amber-600 text-white rounded-br-none">
                  <textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full bg-transparent text-white placeholder-amber-200 resize-none focus:outline-none leading-relaxed whitespace-pre-wrap" rows={Math.max(2, editedContent.split('\n').length)} autoFocus />
                  <div className="flex justify-end gap-2 mt-2">
                      <button onClick={handleCancelEdit} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-white/20 hover:bg-white/30 transition-colors">Cancel</button>
                      <button onClick={handleSaveEdit} className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-white text-amber-600 hover:bg-neutral-200 transition-colors">Save & Submit</button>
                  </div>
              </div>
          </div>
      )
  }

  return (
      <div id={messageId} className="flex justify-end">
          <div className="flex flex-col items-end gap-2" onMouseDown={handlePressStart} onMouseUp={handlePressEnd} onMouseLeave={handlePressEnd} onTouchStart={handlePressStart} onTouchEnd={handlePressEnd} style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
              {url && (
                 <a 
                    href={url.startsWith('http') ? url : `https://${url}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className="max-w-[280px] sm:max-w-2xl w-full p-3 pr-4 rounded-2xl bg-amber-600/90 dark:bg-amber-600/80 backdrop-blur-sm text-white rounded-br-none flex items-center gap-3 shadow-md hover:bg-amber-600 transition-colors"
                >
                    <Link className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium truncate flex-1">{url}</span>
                </a>
              )}
              {images && images.length > 0 && (
                  <div className="relative max-w-[250px] sm:max-w-xs w-full rounded-2xl overflow-hidden group shadow-md">
                      <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                          {images.map((img, idx) => (
                              <div key={idx} className="relative flex-shrink-0 w-full aspect-video bg-neutral-200 dark:bg-gray-800">
                                  <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`User upload ${idx + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => setModalImage(`data:${img.mimeType};base64,${img.base64}`)} />
                                  {isAnalyzingImage && analyzingIndex === idx && <ImageAnalysisAnimation />}
                                  {analysisCompleted && (
                                    <div className="absolute bottom-2 right-2 flex items-center justify-center p-1 bg-green-500/80 dark:bg-green-600/80 text-white backdrop-blur-sm rounded-full shadow-md" title="Analysis Complete">
                                        <Check className="h-3 w-3" />
                                    </div>
                                  )}
                              </div>
                          ))}
                      </div>
                      {totalImages > 1 && (
                          <>
                              <button onClick={() => setCurrentIndex(prev => (prev - 1 + totalImages) % totalImages)} className="absolute top-1/2 left-1 -translate-y-1/2 p-1 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 backdrop-blur-sm hover:bg-black/60">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                              </button>
                              <button onClick={() => setCurrentIndex(prev => (prev + 1) % totalImages)} className="absolute top-1/2 right-1 -translate-y-1/2 p-1 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 backdrop-blur-sm hover:bg-black/60">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                              </button>
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                  {images.map((_, idx) => (
                                      <button key={idx} onClick={() => setCurrentIndex(idx)} className={`w-1.5 h-1.5 rounded-full transition-colors ${currentIndex === idx ? 'bg-white' : 'bg-white/50'}`}/>
                                  ))}
                              </div>
                          </>
                      )}
                  </div>
              )}
              {file && (
                  <div className="relative">
                      {file.mimeType.includes('pdf') || file.mimeType.includes('plain') ? (() => {
                          const isPdf = file.mimeType.includes('pdf');
                          const iconColor = isPdf ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400';
                          return (
                              <a href={`data:${file.mimeType};base64,${file.base64}`} target="_blank" rel="noopener noreferrer">
                                  <div className="relative w-[200px] aspect-[16/9] bg-neutral-200 dark:bg-gray-800 rounded-2xl p-3 flex flex-col items-center justify-center gap-1 text-center hover:bg-neutral-300 dark:hover:bg-gray-700 transition-colors">
                                      <FileText className={`h-8 w-8 flex-shrink-0 ${iconColor}`} />
                                      <span className="font-medium text-sm break-all text-neutral-700 dark:text-gray-300">{truncateFileName(file.name)}</span>
                                      {file.size && <span className="text-xs text-neutral-500 dark:text-gray-400 mt-1">{formatFileSize(file.size)}</span>}
                                  </div>
                              </a>
                          );
                      })() : (
                          <div className="max-w-[200px] p-2.5 rounded-2xl bg-amber-500 flex items-center gap-2.5 text-white">
                              <FileIcon mimeType={file.mimeType} />
                              <span className="font-medium truncate text-sm">{file.name}</span>
                          </div>
                      )}
                      {isAnalyzingFile && <FileAnalysisAnimation />}
                  </div>
              )}
              {content && (
                  <div className="max-w-[280px] sm:max-w-2xl p-4 rounded-2xl bg-amber-600 text-white rounded-br-none">
                      <p className="leading-relaxed whitespace-pre-wrap break-words">{content}</p>
                  </div>
              )}
              
              {isMenuVisible && (
                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={handleEdit} className="text-neutral-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-gray-200 transition-colors" aria-label="Edit"><Pencil className="h-5 w-5" /></button>
                      <button onClick={handleCopy} className="text-neutral-500 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-gray-200 transition-colors" aria-label="Copy">{isCopied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}</button>
                  </div>
              )}
          </div>
      </div>
  );
};

export default UserMessage;