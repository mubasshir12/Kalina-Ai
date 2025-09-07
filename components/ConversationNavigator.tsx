import React from 'react';
import { ChatMessage } from '../types';

interface ConversationNavigatorProps {
    messages: ChatMessage[];
    messageIndices: number[];
    activeMessageIndex: number | null;
    onJumpToMessage: (messageIndex: number) => void;
    thumbInfo: { top: number, height: number };
    messagePositions: Map<number, number>;
}

const ConversationNavigator: React.FC<ConversationNavigatorProps> = ({
    messages,
    messageIndices,
    activeMessageIndex,
    onJumpToMessage,
    thumbInfo,
    messagePositions,
}) => {
    return (
        <div 
            className="absolute top-0 right-[-8px] h-full w-6 flex items-center justify-center py-4 z-20 pointer-events-none"
            aria-hidden="true"
        >
            <div className="relative h-full w-full flex flex-col items-center">
                {/* Track for dots and thumb - Made thinner */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-px bg-neutral-200/60 dark:bg-gray-700/60 rounded-full" />
                
                {/* Thumb indicator with dynamic height and position */}
                <div 
                    className="absolute left-1/2 -translate-x-1/2 w-2 bg-amber-500 rounded-full transition-all duration-100 ease-out"
                    style={{ 
                        top: `${thumbInfo.top}%`,
                        height: `${thumbInfo.height}%`
                    }}
                />
                
                {/* Dots are positioned absolutely based on their message's position */}
                <div className="relative w-full h-full pointer-events-auto">
                    {messageIndices.map((messageIndex) => {
                        const message = messages[messageIndex];
                        // Only render dots for user messages
                        if (!message || message.role !== 'user') {
                            return null;
                        }

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
        </div>
    );
};

export default ConversationNavigator;