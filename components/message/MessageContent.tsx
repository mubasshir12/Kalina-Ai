import React from 'react';
import { ChatMessage as ChatMessageType, MoleculeData, OrbitalData } from '../../types';
import MarkdownRenderer from '../MarkdownRenderer';
import ThinkingProcess from '../ThinkingProcess';
import WebSearchAnimation from '../WebSearchAnimation';
import UrlReaderAnimation from '../ToolUsageAnimation';
import MoleculeViewer from '../MoleculeViewer';
import MoleculeAnimation from '../MoleculeAnimation';
import OrbitalViewer from '../OrbitalViewer';
import OrbitalAnimation from '../OrbitalAnimation';
import MultiAgentProcessing from '../MultiAgentProcessing';
import AgentBreakdown from '../AgentBreakdown';
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
    setCodeForPreview: (data: { code: string; language: string; } | null) => void;
    onMaximizeMoleculeViewer: (molecule: MoleculeData) => void;
    onMaximizeOrbitalViewer: (orbital: OrbitalData) => void;
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
    setModalImage,
    setCodeForPreview,
    isMoleculeRequest,
    molecule,
    onMaximizeMoleculeViewer,
    moleculeNameForAnimation,
    isOrbitalRequest,
    orbital,
    onMaximizeOrbitalViewer,
    isMultiAgent,
    activeAgent,
    agentProcess,
    activeAgentStatusMessage,
}) => {
    const showThinkingProcess = isThinking || (thoughts && thoughts.length > 0);

    if (isMultiAgent && toolInUse === 'multi-agent') {
        return <MultiAgentProcessing activeAgent={activeAgent} agentProcess={agentProcess} activeAgentStatusMessage={activeAgentStatusMessage} />;
    }

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

            {isMoleculeRequest && <MoleculeAnimation moleculeName={moleculeNameForAnimation} />}
            
            {isOrbitalRequest && <OrbitalAnimation orbitalName={orbital?.name} />}

            {!isPlanning && toolInUse === 'url' && <UrlReaderAnimation isLongToolUse={isLongToolUse} />}

            {!isPlanning && toolInUse !== 'url' && toolInUse !== 'multi-agent' && showThinkingProcess && (
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
            
            {molecule && <MoleculeViewer molecule={molecule} onMaximize={() => onMaximizeMoleculeViewer(molecule)} />}
            
            {orbital && <OrbitalViewer orbital={orbital} onMaximize={onMaximizeOrbitalViewer ? () => onMaximizeOrbitalViewer(orbital) : undefined} />}

            <div className="text-neutral-800 dark:text-gray-200 leading-relaxed dark:blurry-text-effect">
            
            {content ? <MarkdownRenderer content={content} sources={sources} isStreaming={!!isStreaming} setCodeForPreview={setCodeForPreview} /> : null}
            
            {isStreaming && content ? <span className="inline-block w-2 h-4 bg-neutral-800 dark:bg-white animate-pulse ml-1" /> : null}
            </div>

            {agentProcess && agentProcess.length > 0 && !isStreaming && (
                <AgentBreakdown process={agentProcess} />
            )}
       </>
    );
}

export default MessageContent;