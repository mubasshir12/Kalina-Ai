import { AgentName } from '../types';
import { Search, CheckCircle2, Megaphone, Target, Bot, Sparkles } from 'lucide-react';

export const agentMetadata: Record<AgentName, { name: string; icon: React.ElementType, color: string }> = {
    researcher: { name: 'Researcher', icon: Search, color: 'text-blue-500' },
    'fact-checker': { name: 'Fact-Checker', icon: CheckCircle2, color: 'text-green-500' },
    advocate: { name: 'Advocate', icon: Megaphone, color: 'text-purple-500' },
    critic: { name: 'Critic', icon: Target, color: 'text-yellow-500' },
    executer: { name: 'Executer', icon: Bot, color: 'text-indigo-500' },
    finalizer: { name: 'Finalizer', icon: Sparkles, color: 'text-pink-500' },
};

export const allAgents: { id: AgentName; name: string; icon: React.ElementType }[] = [
    { id: 'researcher', name: 'Researcher', icon: Search },
    { id: 'fact-checker', name: 'Fact-Checker', icon: CheckCircle2 },
    { id: 'advocate', name: 'Advocate', icon: Megaphone },
    { id: 'critic', name: 'Critic', icon: Target },
    { id: 'executer', name: 'Executer', icon: Bot },
    { id: 'finalizer', name: 'Finalizer', icon: Sparkles },
];
