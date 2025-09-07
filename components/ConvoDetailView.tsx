import React from 'react';
import { ChatMessage } from '../../types';
import { ArrowLeft } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import Tooltip from './Tooltip';
import ModelInfoDisplay from './message/ModelInfoDisplay';

interface ConvoDetailViewProps {
    convoPair: { user: ChatMessage; model: ChatMessage; serialNumber: number } | null;
    onBack: () => void;
    setCodeForPreview: (data: { code: string; language: string; } | null) => void;
}

const formatTokens = (num: number): string => new Intl.NumberFormat().format(num);

const formatTokensLarge = (num: number): string => {
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T"];
    const i = Math.floor(Math.log(num) / Math.log(1000));
    if (i >= suffixes.length) return num.toExponential(1);
    return `${parseFloat((num / Math.pow(1000, i)).toFixed(1))}${suffixes[i]}`;
};

const StatCard: React.FC<{ label: string, value: number, helpText: string }> = ({ label, value, helpText }) => (
    <div className="bg-white/80 dark:bg-[#2E2F33]/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl border border-neutral-200 dark:border-gray-700/50">
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-gray-400 truncate">{label}</p>
        <Tooltip content={<><strong>{label}:</strong> {formatTokens(value)} tokens</>} position="top" align="center">
            <p className="text-lg sm:text-2xl font-bold text-neutral-800 dark:text-gray-200 cursor-help">{formatTokensLarge(value)}</p>
        </Tooltip>
        <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-gray-500 truncate">{helpText}</p>
    </div>
);


const ConvoDetailView: React.FC<ConvoDetailViewProps> = ({ convoPair, onBack, setCodeForPreview }) => {
    if (!convoPair) {
        return (
            <main className="relative z-10 flex-1 p-4 md:p-6 text-center">
                <p>Conversation details not found.</p>
                <button onClick={onBack} className="mt-4 text-amber-600 dark:text-amber-400">Go Back</button>
            </main>
        );
    }

    const { user, model, serialNumber } = convoPair;
    const totalTokens = (model.inputTokens || 0) + (model.outputTokens || 0) + (model.systemTokens || 0);

    const formattedTimestamp = model.timestamp
        ? new Date(model.timestamp).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : 'N/A';

    return (
        <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-800 transition-colors mr-2 md:mr-4" aria-label="Back to details list">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-neutral-800 dark:text-gray-200">Conversation Turn #{serialNumber}</h1>
                        <p className="text-sm text-neutral-500 dark:text-gray-400">{formattedTimestamp}</p>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral-200 dark:border-gray-700 mb-6 p-6">
                    <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200 mb-4">Token Usage</h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard label="Input" value={model.inputTokens || 0} helpText="User prompt tokens" />
                        <StatCard label="Output" value={model.outputTokens || 0} helpText="Model response tokens" />
                        <StatCard label="System" value={model.systemTokens || 0} helpText="Instructions & context" />
                        <StatCard label="Total" value={totalTokens} helpText="Total for this turn" />
                    </div>
                </div>
                
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200 mb-2">User Prompt</h2>
                         <div className="flex justify-end">
                            <div className="inline-block">
                                {user.images && user.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 justify-end">
                                        {user.images.map((img, idx) => (
                                            <img key={idx} src={`data:${img.mimeType};base64,${img.base64}`} alt={`User upload ${idx + 1}`} className="max-w-[150px] max-h-[150px] object-cover rounded-lg border border-neutral-300 dark:border-gray-600" />
                                        ))}
                                    </div>
                                )}
                                {user.content && (
                                    <div className="max-w-none p-4 rounded-2xl bg-amber-600 text-white rounded-br-none">
                                        <p className="leading-relaxed whitespace-pre-wrap break-words">{user.content}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200 mb-2">AI Response</h2>
                        <div className="w-full max-w-none">
                             <MarkdownRenderer 
                                content={model.content} 
                                sources={model.sources}
                                onContentUpdate={() => {}}
                                isStreaming={false}
                                setCodeForPreview={setCodeForPreview}
                            />
                            <div className="mt-2 text-xs text-neutral-400 dark:text-gray-500 font-mono flex items-center gap-x-4 gap-y-1 flex-wrap">
                                {model.modelUsed && <ModelInfoDisplay modelId={model.modelUsed} />}
                                {model.generationTime && model.generationTime > 0 && (
                                    <Tooltip
                                        content={<div>Total generation time</div>}
                                        position="bottom"
                                    >
                                        <span className="cursor-help">{`${(model.generationTime / 1000).toFixed(1)}s`}</span>
                                    </Tooltip>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    );
};

export default ConvoDetailView;