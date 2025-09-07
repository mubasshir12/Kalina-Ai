import React, { useMemo } from 'react';

interface ConversationNavigatorProps {
    userMessageIndices: number[];
    activeMessageIndex: number | null;
    onJumpToMessage: (messageIndex: number) => void;
    messagePositions: Map<number, number>;
}

const ConversationNavigator: React.FC<ConversationNavigatorProps> = ({
    userMessageIndices,
    activeMessageIndex,
    onJumpToMessage,
    messagePositions,
}) => {
    const visibleIndices = useMemo(() => {
        const windowSize = 5;
        if (userMessageIndices.length <= windowSize) {
            return userMessageIndices;
        }

        const activeUserIndex = userMessageIndices.indexOf(activeMessageIndex ?? -1);

        if (activeUserIndex === -1) {
            // Default to showing the last few dots if nothing is active or the active one is not a user message
            return userMessageIndices.slice(-windowSize);
        }

        const halfWindow = Math.floor(windowSize / 2);
        let startIndex = Math.max(0, activeUserIndex - halfWindow);
        let endIndex = startIndex + windowSize;

        if (endIndex > userMessageIndices.length) {
            endIndex = userMessageIndices.length;
            startIndex = Math.max(0, endIndex - windowSize);
        }
        
        return userMessageIndices.slice(startIndex, endIndex);

    }, [userMessageIndices, activeMessageIndex]);

    return (
        <div 
            className="absolute top-0 right-[-8px] h-full w-6 flex items-center justify-center py-4 z-20 pointer-events-none"
            aria-hidden="true"
        >
            <div className="relative w-full h-full pointer-events-auto">
                {/* Dots are positioned absolutely based on their message's position */}
                {visibleIndices.map((messageIndex) => {
                    const isActive = messageIndex === activeMessageIndex;
                    const topPercent = messagePositions.get(messageIndex);

                    if (topPercent === undefined) {
                        return null;
                    }
                    
                    const baseSize = 'w-2 h-2';
                    const baseColor = isActive
                        ? 'bg-amber-500'
                        : 'bg-neutral-300 dark:bg-gray-600';
                    const activeEffect = isActive
                        ? 'scale-[1.75] ring-4 ring-amber-500/30'
                        : 'hover:bg-amber-400 dark:hover:bg-amber-500 hover:scale-125';

                    return (
                        <button
                            key={`nav-dot-${messageIndex}`}
                            onClick={(e) => { e.stopPropagation(); onJumpToMessage(messageIndex); }}
                            className={`
                                absolute left-1/2 -translate-x-1/2 -translate-y-1/2
                                rounded-full transition-all duration-200 z-10
                                ${baseSize} ${baseColor} ${activeEffect}
                            `}
                            style={{ top: `${topPercent}%` }}
                            aria-label={`Jump to message ${messageIndex}`}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default ConversationNavigator;