import React from 'react';
import { AgentProcess, AgentName } from '../types';
import { Globe, ChevronDown } from 'lucide-react';
import { agentMetadata } from '../services/agentService';

interface AgentBreakdownProps {
    process: AgentProcess[];
}

const AgentBreakdown: React.FC<AgentBreakdownProps> = ({ process }) => {
    const totalDuration = process.reduce((sum, step) => sum + step.duration, 0);
    // FIX: Assign the icon component to a capitalized variable so JSX can render it correctly,
    // resolving the "expression is not callable" error.
    const ExecuterIcon = agentMetadata.executer.icon;

    return (
        <details className="bg-neutral-100 dark:bg-gray-800/50 rounded-lg mt-4 border border-neutral-200 dark:border-gray-700 group">
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
            <div className="p-4 border-t border-neutral-200 dark:border-gray-700">
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
                               <span className="font-mono text-neutral-500 dark:text-gray-400">{(duration / 1000).toFixed(2)}s</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </details>
    );
};

export default AgentBreakdown;