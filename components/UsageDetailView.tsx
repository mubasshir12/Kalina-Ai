import React, { useMemo } from 'react';
import { Conversation, ChatMessage } from '../types';
import { ArrowLeft, MessageSquareText, Zap } from 'lucide-react';
import Tooltip from './Tooltip';

const formatTokens = (num: number): string => {
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T"];
    const i = Math.floor(Math.log(num) / Math.log(1000));
    if (i >= suffixes.length) return num.toExponential(1);
    return `${parseFloat((num / Math.pow(1000, i)).toFixed(1))}${suffixes[i]}`;
};

const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

const truncateText = (text: string, start = 40, end = 20): string => {
    if (!text) return 'No text content';
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    if (cleanedText.length <= start + end) return cleanedText;
    return `${cleanedText.slice(0, start)}...${cleanedText.slice(-end)}`;
};

interface UsageDetailViewProps {
    conversation: Conversation | undefined;
    onBack: () => void;
    onViewConvoDetails: (convoPair: { user: ChatMessage; model: ChatMessage; serialNumber: number }) => void;
}

const UsageDetailView: React.FC<UsageDetailViewProps> = ({ conversation, onBack, onViewConvoDetails }) => {

    const convoPairs = useMemo(() => {
        if (!conversation) return [];
        const pairs: { user: ChatMessage, model: ChatMessage }[] = [];
        let currentUserMessage: ChatMessage | null = null;

        for (const message of conversation.messages) {
            if (message.role === 'user') {
                currentUserMessage = message;
            } else if (message.role === 'model' && currentUserMessage) {
                // Only count pairs where the model message has token info
                if (typeof message.inputTokens === 'number' || typeof message.outputTokens === 'number' || typeof message.systemTokens === 'number') {
                    pairs.push({ user: currentUserMessage, model: message });
                }
                currentUserMessage = null; // Reset for the next pair
            }
        }
        return pairs.reverse(); // Show most recent first
    }, [conversation]);

    if (!conversation) {
        return (
            <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6 text-center">
                <p>Conversation not found.</p>
                <button onClick={onBack} className="mt-4 text-amber-600 dark:text-amber-400">Go Back</button>
            </main>
        );
    }

    return (
        <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-800 transition-colors mr-2 md:mr-4" aria-label="Back to usage dashboard">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-neutral-800 dark:text-gray-200">Token Breakdown</h1>
                        <p className="text-sm text-neutral-500 dark:text-gray-400 truncate max-w-xs sm:max-w-md">{conversation.title}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {convoPairs.length > 0 ? (
                        convoPairs.map(({ user, model }, index) => {
                            const totalTokens = (model.inputTokens || 0) + (model.outputTokens || 0) + (model.systemTokens || 0);
                            const serialNumber = convoPairs.length - index;
                            return (
                                <button 
                                    key={model.id} 
                                    onClick={() => onViewConvoDetails({ user, model, serialNumber })}
                                    className="w-full text-left bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-xl p-4 border border-neutral-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-white dark:hover:bg-[#2E2F33] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-mono text-neutral-500 dark:text-gray-400 mb-2">CONVO #{serialNumber}</p>
                                            <p className="text-sm font-semibold text-neutral-800 dark:text-gray-200">User</p>
                                            <p className="text-sm text-neutral-500 dark:text-gray-400 italic truncate">"{truncateText(user.content)}"</p>
                                            <p className="text-sm font-semibold text-neutral-800 dark:text-gray-200 mt-2">Kalina AI</p>
                                            <p className="text-sm text-neutral-500 dark:text-gray-400 truncate">"{truncateText(model.content)}"</p>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <Tooltip content={<><strong>Total:</strong> {formatNumber(totalTokens)} tokens</>} position="top" align="right">
                                                <p className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 cursor-help">
                                                    <Zap className="w-4 h-4" />
                                                    {formatTokens(totalTokens)}
                                                </p>
                                            </Tooltip>
                                            <p className="text-xs text-neutral-400 dark:text-gray-500">Tokens</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center text-neutral-500 dark:text-gray-400 py-12 px-4 bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-xl border border-dashed border-neutral-300 dark:border-gray-700">
                            <MessageSquareText className="h-12 w-12 mx-auto text-neutral-400 dark:text-gray-500 mb-3" />
                            <h3 className="font-semibold text-neutral-800 dark:text-gray-200">No Token Usage Data</h3>
                            <p className="text-sm">This conversation has no messages with token information recorded.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
};

export default UsageDetailView;
