import React from 'react';
import { AgentProcess, AgentName } from '../types';
import { Globe, ChevronDown, Cpu } from 'lucide-react';
import { agentMetadata } from '../services/agentService';

interface AgentBreakdownProps {
    process: AgentProcess[];
}

const AgentBreakdown: React.FC<AgentBreakdownProps> = ({ process }) => {
    const totalDuration = process.reduce((sum, step) => sum + step.duration, 0);
    const totalInput = process.reduce((sum, step) => sum + (step.inputTokens || 0), 0);
    const totalOutput = process.reduce((sum, step) => sum + (step.outputTokens || 0), 0);
    const grandTotalTokens = totalInput + totalOutput;

    const ExecuterIcon = agentMetadata.executer.icon;

    return (
        <details className="bg-neutral-100 dark:bg-gray-800/50 rounded-lg mt-4 border border-neutral-200 dark:border-gray-700 group" open>
            <summary className="p-3 cursor-pointer text-sm font-medium text-neutral-700 dark:text-gray-300 flex items-center gap-2 hover:bg-neutral-200/60 dark:hover:bg-gray-700/50 rounded-t-lg transition-colors list-none [&::-webkit-details-marker]:hidden">
                <div className="h-5 w-5 text-neutral-500 dark:text-gray-400 flex items-center justify-center">
                    <ExecuterIcon className="w-5 h-5" />
                </div>
                <span>Multi-Agent Process</span>
                <span className="ml-1 text-neutral-500 dark:text-gray-400">({(totalDuration / 1000).toFixed(1)}s)</span>
                <div className="ml-auto text-neutral-500 dark:text-gray-400">
                    <ChevronDown className="w-5 h-5 block group-open:hidden transition-transform" />
                    <ChevronDown className="w-5 h-5 hidden group-open:block rotate-180 transition-transform" />
                </div>
            </summary>
            <div className="p-4 border-t border-neutral-200 dark:border-gray-700 space-y-3">
                <ul className="space-y-3">
                    {process.map(({ agent, duration, usedWebSearch }, index) => {
                        const { name, icon: Icon, color } = agentMetadata[agent];
                        return (
                            <li key={index} className="flex items-center gap-3 text-sm text-neutral-600 dark:text-gray-300">
                               <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                               <span className="font-semibold flex-1">{name}</span>
                               {usedWebSearch && (
                                    <div className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400">
                                        <Globe className="w-4 h-4" />
                                        <span className="text-xs font-semibold">Used Web Search</span>
                                    </div>
                                )}
                               <div className="ml-auto flex items-center gap-4">
                                    <span className="font-mono text-neutral-500 dark:text-gray-400 w-16 text-right">
                                        {(duration / 1000).toFixed(2)}s
                                    </span>
                               </div>
                            </li>
                        );
                    })}
                </ul>

                {/* New Nested Accordion for Tokens */}
                {grandTotalTokens > 0 && (
                    <details className="bg-white/50 dark:bg-gray-900/40 rounded-lg border border-neutral-200 dark:border-gray-700/50 group/token">
                        <summary className="p-3 cursor-pointer text-xs font-medium text-neutral-600 dark:text-gray-300 flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden">
                            <Cpu className="w-4 h-4 text-neutral-500 dark:text-gray-400" />
                            <span>Total Token Usage:</span>
                            <span className="font-mono font-bold text-neutral-800 dark:text-gray-200">{grandTotalTokens.toLocaleString()}</span>
                            <div className="ml-auto text-neutral-500 dark:text-gray-400">
                                <ChevronDown className="w-4 h-4 block group-open/token:hidden transition-transform" />
                                <ChevronDown className="w-4 h-4 hidden group-open/token:block rotate-180 transition-transform" />
                            </div>
                        </summary>
                        <div className="px-3 pb-3 border-t border-neutral-200 dark:border-gray-700/50">
                            <table className="w-full text-left text-xs font-mono">
                                <thead>
                                    <tr className="text-neutral-500 dark:text-gray-400">
                                        <th className="py-2 font-semibold">Agent</th>
                                        <th className="py-2 font-semibold text-right">Input</th>
                                        <th className="py-2 font-semibold text-right">Output</th>
                                        <th className="py-2 font-semibold text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {process.map(({ agent, inputTokens = 0, outputTokens = 0 }) => {
                                        const { name } = agentMetadata[agent];
                                        return (
                                            <tr key={agent} className="border-t border-neutral-200 dark:border-gray-700/50 text-neutral-700 dark:text-gray-300">
                                                <td className="py-2 font-sans font-medium">{name}</td>
                                                <td className="py-2 text-right">{inputTokens.toLocaleString()}</td>
                                                <td className="py-2 text-right">{outputTokens.toLocaleString()}</td>
                                                <td className="py-2 text-right font-bold">{(inputTokens + outputTokens).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                    <tr className="border-t-2 border-neutral-300 dark:border-gray-600 font-bold text-neutral-800 dark:text-gray-200">
                                        <td className="py-2 font-sans">Grand Total</td>
                                        <td className="py-2 text-right">{totalInput.toLocaleString()}</td>
                                        <td className="py-2 text-right">{totalOutput.toLocaleString()}</td>
                                        <td className="py-2 text-right">{grandTotalTokens.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </details>
                )}
            </div>
        </details>
    );
};

export default AgentBreakdown;