import React, { useState, useEffect } from 'react';
import { AgentName, AgentProcess } from '../types';
import { agentMetadata, allAgents } from '../services/agentService';
import AgentWebSearchAnimation from './AgentWebSearchAnimation';
import AgentIconAnimation from './AgentIconAnimation';

const searchKeywords = ['search', 'web', 'online', 'verifying', 'gathering', 'finding', 'cross-referencing'];

interface MultiAgentProcessingProps {
    activeAgent?: AgentName;
    agentProcess?: AgentProcess[];
    activeAgentStatusMessage?: string;
}

const AgentDisplay = ({ agent, isActive, isCompleted }: { agent: typeof allAgents[0], isActive: boolean, isCompleted: boolean }) => {
    const Icon = agent.icon;
    const stateClasses = {
        icon: isCompleted ? 'text-white' : 'text-neutral-400 dark:text-gray-500',
        text: isActive ? 'text-neutral-800 dark:text-gray-200' : (isCompleted ? 'text-neutral-700 dark:text-gray-300' : 'text-neutral-400 dark:text-gray-500'),
        bg: isCompleted ? 'bg-green-500' : 'bg-neutral-200 dark:bg-gray-700/60',
    };
    
    const iconContainerPulse = !isActive && !isCompleted ? 'animate-pulse' : '';

    return (
        <div className="flex flex-col items-center gap-2 flex-shrink-0 w-20 text-center">
            <div className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 overflow-hidden ${stateClasses.bg} ${iconContainerPulse}`}>
                <AgentIconAnimation agentName={agent.id} isActive={isActive} />
                {!isActive && <Icon className={`w-6 h-6 transition-colors duration-300 relative z-10 ${stateClasses.icon}`} />}
            </div>
            <span className={`text-xs font-semibold transition-colors duration-300 ${stateClasses.text}`}>{agent.name}</span>
        </div>
    );
};

const Connector = ({ isCompleted }: { isCompleted: boolean }) => (
    <div className={`flex-1 h-px transition-colors duration-500 ${isCompleted ? 'bg-green-400' : 'bg-neutral-200 dark:bg-gray-700'}`}></div>
);

const MultiAgentProcessing: React.FC<MultiAgentProcessingProps> = ({ activeAgent, agentProcess = [], activeAgentStatusMessage }) => {
    const [elapsedTime, setElapsedTime] = useState(0);
    
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 0.1);
        }, 100);
        return () => clearInterval(timer);
    }, []);

    const completedAgentsSet = new Set(agentProcess.map(p => p.agent));
    const activeAgentData = allAgents.find(a => a.id === activeAgent);
    
    const isSearching = (activeAgent === 'researcher') || (activeAgentStatusMessage && searchKeywords.some(keyword => activeAgentStatusMessage.toLowerCase().includes(keyword)));

    return (
        <div className="flex flex-col items-center justify-center my-4 p-4 gap-4 rounded-lg bg-neutral-100 dark:bg-gray-800/50 border border-neutral-200 dark:border-gray-700">
            {/* Mobile View: 2 rows */}
            <div className="sm:hidden w-full flex flex-col items-center gap-2">
                <div className="flex w-full items-center">
                    {allAgents.slice(0, 4).map((agent, index) => {
                        const isCompleted = completedAgentsSet.has(agent.id);
                        return (
                           <React.Fragment key={agent.id}>
                                <AgentDisplay agent={agent} isActive={activeAgent === agent.id} isCompleted={isCompleted} />
                                {index < 3 && <Connector isCompleted={isCompleted} />}
                           </React.Fragment>
                        );
                    })}
                </div>
                <div className="flex w-1/2 items-center">
                     {allAgents.slice(4, 6).map((agent, index) => {
                        const isCompleted = completedAgentsSet.has(agent.id);
                        return (
                           <React.Fragment key={agent.id}>
                                <AgentDisplay agent={agent} isActive={activeAgent === agent.id} isCompleted={isCompleted} />
                                {index < 1 && <Connector isCompleted={isCompleted} />}
                           </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Desktop View: 1 row */}
            <div className="hidden sm:flex w-full items-center">
                {allAgents.map((agent, index) => {
                    const isCompleted = completedAgentsSet.has(agent.id);
                     return (
                       <React.Fragment key={agent.id}>
                            <AgentDisplay agent={agent} isActive={activeAgent === agent.id} isCompleted={isCompleted} />
                            {index < allAgents.length - 1 && <Connector isCompleted={isCompleted} />}
                       </React.Fragment>
                    );
                })}
            </div>


            <div className="w-full h-px bg-neutral-200 dark:border-gray-700 my-1"></div>

            <div className="w-full flex items-center justify-between text-sm text-neutral-600 dark:text-gray-300 min-h-[20px]">
                {isSearching ? (
                    <AgentWebSearchAnimation statusMessage={activeAgentStatusMessage} />
                ) : (
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-semibold flex-shrink-0">{activeAgentData?.name || 'System'}:</span>
                        <span className="whitespace-nowrap">
                            {activeAgentStatusMessage || "Processing..."}
                        </span>
                    </div>
                )}
                <span className="font-mono font-semibold">{elapsedTime.toFixed(1)}s</span>
            </div>
        </div>
    );
};

export default MultiAgentProcessing;