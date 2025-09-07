
import React, { useMemo } from 'react';
import { Conversation } from '../types';
import { ArrowLeft, MessageSquareText, LogIn, LogOut, Cpu, Languages } from 'lucide-react';
import Tooltip from './Tooltip';

interface UsageStatsViewProps {
    conversations: Conversation[];
    translatorUsage: { input: number, output: number };
    onBack: () => void;
    onViewDetails: (conversationId: string) => void;
}

// New formatter for large numbers
const formatTokens = (num: number): string => {
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T"];
    const i = Math.floor(Math.log(num) / Math.log(1000));
    if (i >= suffixes.length) return num.toExponential(1);
    return `${parseFloat((num / Math.pow(1000, i)).toFixed(1))}${suffixes[i]}`;
};

const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

const StatCard: React.FC<{ icon?: React.ElementType, label: string, value: number, colorClass: string, helpText: string }> = ({ icon: Icon, label, value, colorClass, helpText }) => (
    <div className="bg-white/80 dark:bg-[#2E2F33]/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-4 border border-neutral-200 dark:border-gray-700/50">
        {Icon && (
            <div className={`p-2 sm:p-3 rounded-full ${colorClass} flex-shrink-0`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
        )}
        <div className="flex-1 overflow-hidden">
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-gray-400 truncate">{label}</p>
            <Tooltip content={<><strong>{label}:</strong> {formatNumber(value)} tokens</>} position="top" align="center">
                <p className="text-lg sm:text-2xl font-bold text-neutral-800 dark:text-gray-200 cursor-help">{formatTokens(value)}</p>
            </Tooltip>
            <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-gray-500 truncate">{helpText}</p>
        </div>
    </div>
);


const UsageStatsView: React.FC<UsageStatsViewProps> = ({ conversations, translatorUsage, onBack, onViewDetails }) => {
    
    const { grandTotal, conversationStats, translatorTotal } = useMemo(() => {
        const chatTotal = { input: 0, output: 0, system: 0, total: 0, messageCount: 0 };

        const conversationStats = conversations.map(convo => {
            const stats = {
                id: convo.id,
                title: convo.title,
                input: 0,
                output: 0,
                system: 0,
                total: 0,
                messageCount: convo.messages.filter(m => m.role === 'model' && (m.inputTokens || m.outputTokens)).length
            };

            convo.messages.forEach(msg => {
                if (msg.role === 'model') {
                    stats.input += msg.inputTokens || 0;
                    stats.output += msg.outputTokens || 0;
                    stats.system += msg.systemTokens || 0;
                }
            });
            stats.total = stats.input + stats.output + stats.system;
            
            chatTotal.input += stats.input;
            chatTotal.output += stats.output;
            chatTotal.system += stats.system;
            chatTotal.total += stats.total;
            chatTotal.messageCount += stats.messageCount;

            return stats;
        }).filter(s => s.total > 0).sort((a,b) => b.total - a.total);

        const translatorTotal = translatorUsage.input + translatorUsage.output;
        
        const grandTotal = {
            input: chatTotal.input + translatorUsage.input,
            output: chatTotal.output + translatorUsage.output,
            system: chatTotal.system,
            total: chatTotal.total + translatorTotal
        };

        return { grandTotal, conversationStats, translatorTotal };
    }, [conversations, translatorUsage]);

    const totalPercentage = (value: number, total: number) => {
        if (total === 0) return '0%';
        return `${((value / total) * 100).toFixed(1)}%`;
    }
    
    const ProgressBarTooltipContent = ({ label, value, total }: { label: string, value: number, total: number }) => (
        <div className="text-center">
            <strong className="block">{label}</strong>
            <span>{formatNumber(value)} tokens ({totalPercentage(value, total)})</span>
        </div>
    );

    return (
        <main className="relative z-10 flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-800 transition-colors mr-2 md:mr-4" aria-label="Back to chat">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-gray-200">Usage Dashboard</h1>
                </div>

                <div className="bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral-200 dark:border-gray-700 mb-6 p-6">
                    <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200 mb-1">Overall Usage</h2>
                    <p className="text-sm text-neutral-500 dark:text-gray-400 mb-4">Total tokens used across all tools.</p>
                    
                    <div className="text-center mb-6">
                        <Tooltip content={<><strong>Total Tokens:</strong> {formatNumber(grandTotal.total)}</>} position="top" align="center">
                             <p className="text-5xl font-extrabold text-amber-600 dark:text-amber-400 cursor-help">{formatTokens(grandTotal.total)}</p>
                        </Tooltip>
                        <p className="text-sm font-medium text-neutral-500 dark:text-gray-400">Total Tokens</p>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                        <div className="flex h-3">
                            <Tooltip content={<ProgressBarTooltipContent label="Input" value={grandTotal.input} total={grandTotal.total} />}>
                                <div className="bg-blue-500 rounded-l-full h-full" style={{ width: totalPercentage(grandTotal.input, grandTotal.total) }}></div>
                            </Tooltip>
                             <Tooltip content={<ProgressBarTooltipContent label="Output" value={grandTotal.output} total={grandTotal.total} />}>
                                <div className="bg-green-500 h-full" style={{ width: totalPercentage(grandTotal.output, grandTotal.total) }}></div>
                            </Tooltip>
                            <Tooltip content={<ProgressBarTooltipContent label="System" value={grandTotal.system} total={grandTotal.total} />}>
                                <div className="bg-yellow-500 rounded-r-full h-full" style={{ width: totalPercentage(grandTotal.system, grandTotal.total) }}></div>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <StatCard label="Input" value={grandTotal.input} helpText="User prompt tokens" colorClass="bg-blue-500" />
                        <StatCard label="Output" value={grandTotal.output} helpText="Model response tokens" colorClass="bg-green-500" />
                        <StatCard label="System" value={grandTotal.system} helpText="Instructions & context" colorClass="bg-yellow-500" />
                    </div>
                </div>
                
                {translatorTotal > 0 && (
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-neutral-800 dark:text-gray-200 mb-2">Tool Usage</h2>
                        <StatCard icon={Languages} label="Translator Tool" value={translatorTotal} helpText="Total tokens used" colorClass="bg-purple-500" />
                    </div>
                )}


                <div>
                    <h2 className="text-xl font-semibold text-neutral-800 dark:text-gray-200 mb-4">Chat Conversation Breakdown</h2>
                    <div className="space-y-3">
                        {conversationStats.map(stats => (
                             <button key={stats.id} onClick={() => onViewDetails(stats.id)} className="w-full text-left bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-xl p-4 border border-neutral-200 dark:border-gray-700 hover:border-amber-400 dark:hover:border-amber-500 hover:bg-white dark:hover:bg-[#2E2F33] transition-all duration-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-neutral-800 dark:text-gray-200 line-clamp-1">{stats.title}</p>
                                        <p className="text-xs text-neutral-500 dark:text-gray-400">{stats.messageCount} responses</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <Tooltip content={<><strong>Total:</strong> {formatNumber(stats.total)} tokens</>} position="top" align="right">
                                            <p className="font-bold text-lg text-neutral-800 dark:text-gray-200 cursor-help">{formatTokens(stats.total)}</p>
                                        </Tooltip>
                                        <p className="text-xs text-neutral-500 dark:text-gray-400">Tokens</p>
                                    </div>
                                </div>
                                <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className="flex h-2">
                                        <Tooltip content={<ProgressBarTooltipContent label="Input" value={stats.input} total={stats.total} />}>
                                            <div className="bg-blue-500 rounded-l-full h-full" style={{ width: totalPercentage(stats.input, stats.total) }}></div>
                                        </Tooltip>
                                        <Tooltip content={<ProgressBarTooltipContent label="Output" value={stats.output} total={stats.total} />}>
                                            <div className="bg-green-500 h-full" style={{ width: totalPercentage(stats.output, stats.total) }}></div>
                                        </Tooltip>
                                        <Tooltip content={<ProgressBarTooltipContent label="System" value={stats.system} total={stats.total} />}>
                                            <div className="bg-yellow-500 rounded-r-full h-full" style={{ width: totalPercentage(stats.system, stats.total) }}></div>
                                        </Tooltip>
                                    </div>
                                </div>
                            </button>
                        ))}
                         {conversationStats.length === 0 && (
                             <div className="text-center text-neutral-500 dark:text-gray-400 py-12 px-4 bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-xl border border-dashed border-neutral-300 dark:border-gray-700">
                                <MessageSquareText className="h-12 w-12 mx-auto text-neutral-400 dark:text-gray-500 mb-3" />
                                <h3 className="font-semibold text-neutral-800 dark:text-gray-200">No Chat Usage Data</h3>
                                <p className="text-sm">Start a conversation to see token statistics.</p>
                            </div>
                         )}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default UsageStatsView;
