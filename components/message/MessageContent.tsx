import React from 'react';
import { ChatMessage as ChatMessageType } from '../../types';
import MarkdownRenderer from '../MarkdownRenderer';
import ThinkingProcess from '../ThinkingProcess';
import WebSearchAnimation from '../WebSearchAnimation';
import UrlReaderAnimation from '../ToolUsageAnimation';
import MoleculeViewer from '../MoleculeViewer';
import MoleculeAnimation from '../MoleculeAnimation';
import { Brain } from 'lucide-react';

const SkeletonLoader: React.FC = () => (
    <div className="space-y-3 py-2">
        <div className="h-4 shimmer-bg rounded w-5/6"></div>
        <div className="h-4 shimmer-bg rounded w-full"></div>
        <div className="h-4 shimmer-bg rounded w-4/6"></div>
    </div>
);

const MemoryUpdateNotification: React.FC = () => (
    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-gray-400 mb-2 font-medium">
        <Brain className="h-3.5 w-3.5" />
        <span>Memory updated</span>
    </div>
);

interface MessageContentProps extends ChatMessageType {
    setModalImage: (url: string | null) => void;
    isStreaming?: boolean;
    isThinking?: boolean;
    isSearchingWeb?: boolean;
    onUpdateMessageContent: (messageId: string, newContent: string) => void;
    setCodeForPreview: (data: { code: string; language: string; } | null) => void;
}

const MessageContent: React.FC<MessageContentProps> = ({
    id,
    content,
    isStreaming,
    isThinking,
    isSearchingWeb,
    toolInUse,
    isLongToolUse,
    isPlanning,
    sources,
    thoughts,
    searchPlan,
    thinkingDuration,
    memoryUpdated,
    onUpdateMessageContent,
    setModalImage,
    setCodeForPreview,
    isMoleculeRequest,
    molecule,
}) => {
    const showThinkingProcess = isThinking || (thoughts && thoughts.length > 0);

    return (
        <>
            <style>{`
                .shimmer-bg {
                    background-color: #e5e5e5; /* neutral-200 */
                    background-image: linear-gradient(110deg, #e5e5e5 8%, #fcd34d 18%, #e5e5e5 33%); /* neutral-200, amber-300, neutral-200 */
                    background-size: 200% 100%;
                    animation: shimmer 1.8s linear infinite;
                }
                .dark .shimmer-bg {
                    background-color: #1e1f22; 
                    background-image: linear-gradient(110deg, #1e1f22 8%, #b45309 18%, #1e1f22 33%); /* dark bg, amber-700, dark bg */
                    background-size: 200% 100%;
                }
                @keyframes shimmer {
                    to {
                        background-position-x: -200%;
                    }
                }
            `}</style>
            {memoryUpdated && <MemoryUpdateNotification />}

            {isPlanning && <SkeletonLoader />}

            {isMoleculeRequest && <MoleculeAnimation />}
            
            {!isPlanning && toolInUse && <UrlReaderAnimation isLongToolUse={isLongToolUse} />}

            {!isPlanning && !toolInUse && showThinkingProcess && (
                <ThinkingProcess 
                    thoughts={thoughts || []} 
                    duration={thinkingDuration} 
                    isThinking={!!isThinking}
                    isStreaming={isStreaming}
                />
            )}

            {!isPlanning && !toolInUse && !showThinkingProcess && isStreaming && !content && (
                isSearchingWeb ? <div className="flex justify-center items-center"><WebSearchAnimation plan={searchPlan} /></div> : <SkeletonLoader />
            )}
            
            {molecule && <MoleculeViewer molecule={molecule} />}

            <div className="text-neutral-800 dark:text-gray-200 leading-relaxed dark:blurry-text-effect">
            
            {content ? <MarkdownRenderer content={content} sources={sources} onContentUpdate={(newContent) => onUpdateMessageContent(id, newContent)} isStreaming={!!isStreaming} setCodeForPreview={setCodeForPreview} /> : null}
            
            {isStreaming && content ? <span className="inline-block w-2 h-4 bg-neutral-800 dark:bg-white animate-pulse ml-1" /> : null}
            </div>
       </>
    );
}

export default MessageContent;
