import React, { useMemo } from 'react';
import { Conversation } from '../types';
import { ArrowLeft, MessageSquareText, LogIn, LogOut, Cpu, Languages } from 'lucide-react';

interface UsageStatsViewProps {
    conversations: Conversation[];
    translatorUsage: { input: number, output: number };
    onBack: () => void;
}

const StatCard: React.FC<{ icon?: React.ElementType, label: string, value: string, colorClass: string, helpText: string }> = ({ icon: Icon, label, value, colorClass, helpText }) => (
    <div className="bg-white/80 dark:bg-[#2E2F33]/80 backdrop-blur-sm p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-4 border border-neutral-200 dark:border-gray-700/50">
        {Icon && (
            <div className={`p-2 sm:p-3 rounded-full ${colorClass} flex-shrink-0`}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
        )}
        <div className="flex-1 overflow-hidden">
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-gray-400 truncate">{label}</p>
            <p className="text-lg sm:text-2xl font-bold text-neutral-800 dark:text-gray-200">{value}</p>
            <p className="text-[10px] sm:text-xs text-neutral-400 dark:text-gray-500 truncate">{helpText}</p>
        </div>
    </div>
);


const UsageStatsView: React.FC<UsageStatsViewProps> = ({ conversations, translatorUsage, onBack }) => {
    
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

    const formatNumber = (num: number) => new Intl.NumberFormat().format(num);

    const totalPercentage = (value: number, total: number) => {
        if (total === 0) return '0%';
        return `${((value / total) * 100).toFixed(1)}%`;
    }

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
                        <p className="text-5xl font-extrabold text-amber-600 dark:text-amber-400">{formatNumber(grandTotal.total)}</p>
                        <p className="text-sm font-medium text-neutral-500 dark:text-gray-400">Total Tokens</p>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-3 mb-4">
                        <div className="flex h-3">
                            <div className="bg-blue-500 rounded-l-full" style={{ width: totalPercentage(grandTotal.input, grandTotal.total) }} title={`Input: ${totalPercentage(grandTotal.input, grandTotal.total)}`}></div>
                            <div className="bg-green-500" style={{ width: totalPercentage(grandTotal.output, grandTotal.total) }} title={`Output: ${totalPercentage(grandTotal.output, grandTotal.total)}`}></div>
                            <div className="bg-yellow-500 rounded-r-full" style={{ width: totalPercentage(grandTotal.system, grandTotal.total) }} title={`System: ${totalPercentage(grandTotal.system, grandTotal.total)}`}></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <StatCard label="Input" value={formatNumber(grandTotal.input)} helpText="User prompt tokens" colorClass="bg-blue-500" />
                        <StatCard label="Output" value={formatNumber(grandTotal.output)} helpText="Model response tokens" colorClass="bg-green-500" />
                        <StatCard label="System" value={formatNumber(grandTotal.system)} helpText="Instructions & context" colorClass="bg-yellow-500" />
                    </div>
                </div>
                
                {translatorTotal > 0 && (
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-neutral-800 dark:text-gray-200 mb-2">Tool Usage</h2>
                        <StatCard icon={Languages} label="Translator Tool" value={formatNumber(translatorTotal)} helpText="Total tokens used" colorClass="bg-purple-500" />
                    </div>
                )}


                <div>
                    <h2 className="text-xl font-semibold text-neutral-800 dark:text-gray-200 mb-4">Chat Conversation Breakdown</h2>
                    <div className="space-y-3">
                        {conversationStats.map(stats => (
                             <div key={stats.id} className="bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-xl p-4 border border-neutral-200 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-medium text-neutral-800 dark:text-gray-200 line-clamp-1">{stats.title}</p>
                                        <p className="text-xs text-neutral-500 dark:text-gray-400">{stats.messageCount} responses</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <p className="font-bold text-lg text-neutral-800 dark:text-gray-200">{formatNumber(stats.total)}</p>
                                        <p className="text-xs text-neutral-500 dark:text-gray-400">Tokens</p>
                                    </div>
                                </div>
                                <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-2">
                                    <div className="flex h-2">
                                        <div className="bg-blue-500 rounded-l-full" style={{ width: totalPercentage(stats.input, stats.total) }} title={`Input: ${formatNumber(stats.input)}`}></div>
                                        <div className="bg-green-500" style={{ width: totalPercentage(stats.output, stats.total) }} title={`Output: ${formatNumber(stats.output)}`}></div>
                                        <div className="bg-yellow-500 rounded-r-full" style={{ width: totalPercentage(stats.system, stats.total) }} title={`System: ${formatNumber(stats.system)}`}></div>
                                    </div>
                                </div>
                            </div>
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