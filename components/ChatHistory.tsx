import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChatMessage as ChatMessageType, MoleculeData, OrbitalData, GroundingChunk } from '../types';
import ChatMessage from './ChatMessage';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  isThinking: boolean;
  isSearchingWeb: boolean;
  onRetry: () => void;
  onEditMessage: (index: number, newContent: string) => void;
  onCancelStream: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  setModalImage: (url: string | null) => void;
  setCodeForPreview: (data: { code: string; language: string; } | null) => void;
  isSelectionMode: boolean;
  selectedMessageIds: Set<string>;
  onToggleMessageSelection: (userMessageId: string) => void;
  onMaximizeMoleculeViewer: (molecule: MoleculeData) => void;
  onMaximizeOrbitalViewer: (orbital: OrbitalData) => void;
  onViewSources: (sources: GroundingChunk[]) => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ 
  messages, 
  isLoading, 
  isThinking, 
  isSearchingWeb, 
  onRetry, 
  onEditMessage, 
  onCancelStream, 
  scrollContainerRef, 
  setModalImage, 
  setCodeForPreview,
  isSelectionMode,
  selectedMessageIds,
  onToggleMessageSelection,
  onMaximizeMoleculeViewer,
  onMaximizeOrbitalViewer,
  onViewSources
}) => {
  const [isLockedToBottom, setIsLockedToBottom] = useState(true);

  useEffect(() => {
    if (isLockedToBottom && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading, isThinking, isSearchingWeb, isLockedToBottom, scrollContainerRef]);

  useEffect(() => {
    const scrollableElement = scrollContainerRef.current;
    if (!scrollableElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollableElement;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setIsLockedToBottom(atBottom);
    };

    scrollableElement.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => scrollableElement.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef]);

  const pairedMessages = useMemo(() => {
      const result: ({ type: 'pair'; user: ChatMessageType; model: ChatMessageType } | { type: 'single'; message: ChatMessageType })[] = [];
      let i = 0;
      while (i < messages.length) {
          const current = messages[i];
          if (current.role === 'user' && i + 1 < messages.length && messages[i + 1].role === 'model') {
              result.push({ type: 'pair', user: current, model: messages[i + 1] });
              i += 2;
          } else {
              result.push({ type: 'single', message: current });
              i += 1;
          }
      }
      return result;
  }, [messages]);

  return (
    <div className="space-y-4">
      {pairedMessages.map((item) => {
        if (item.type === 'pair') {
            const isSelected = selectedMessageIds.has(item.user.id);
            const canSelect = !isLoading && !isThinking;
            const isLastPair = item.model.id === messages[messages.length - 1]?.id;

            return (
                <div
                    key={item.user.id}
                    onClick={isSelectionMode && canSelect ? () => onToggleMessageSelection(item.user.id) : undefined}
                    className={`transition-colors duration-200 rounded-lg ${isSelectionMode && canSelect ? 'cursor-pointer' : ''} ${isSelected ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
                >
                    <div className={isSelectionMode ? 'p-2' : ''}>
                        <ChatMessage {...item.user} isSelectionMode={isSelectionMode} index={messages.findIndex(m => m.id === item.user.id)} onEditMessage={onEditMessage} setModalImage={setModalImage} setCodeForPreview={setCodeForPreview} onMaximizeMoleculeViewer={onMaximizeMoleculeViewer} onMaximizeOrbitalViewer={onMaximizeOrbitalViewer} onViewSources={() => onViewSources(item.user.sources || [])} />
                        <div className="h-4" />
                        <ChatMessage {...item.model} isSelectionMode={isSelectionMode} index={messages.findIndex(m => m.id === item.model.id)} onRetry={isLastPair && !isLoading && !isThinking ? onRetry : undefined} isStreaming={isLoading && isLastPair} isThinking={isThinking && isLastPair} isSearchingWeb={isSearchingWeb && isLastPair} setModalImage={setModalImage} setCodeForPreview={setCodeForPreview} onMaximizeMoleculeViewer={onMaximizeMoleculeViewer} onMaximizeOrbitalViewer={onMaximizeOrbitalViewer} onViewSources={() => onViewSources(item.model.sources || [])} />
                    </div>
                </div>
            );
        } else { // single message
            const isLastMessage = item.message.id === messages[messages.length-1]?.id;
            return (
                <div key={item.message.id} className={isSelectionMode ? 'opacity-50' : ''}>
                    <ChatMessage 
                        {...item.message}
                        isSelectionMode={isSelectionMode}
                        index={messages.findIndex(m => m.id === item.message.id)}
                        onEditMessage={item.message.role === 'user' ? onEditMessage : undefined}
                        onRetry={isLastMessage && item.message.role === 'model' && !isLoading && !isThinking ? onRetry : undefined}
                        isStreaming={isLoading && isLastMessage}
                        isThinking={isThinking && isLastMessage}
                        isSearchingWeb={isSearchingWeb && isLastMessage}
                        setModalImage={setModalImage}
                        setCodeForPreview={setCodeForPreview}
                        onMaximizeMoleculeViewer={onMaximizeMoleculeViewer}
                        onMaximizeOrbitalViewer={onMaximizeOrbitalViewer}
                        onViewSources={() => onViewSources(item.message.sources || [])}
                    />
                </div>
            );
        }
      })}
    </div>
  );
};

export default ChatHistory;