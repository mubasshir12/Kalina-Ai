import React from 'react';
import { ModelInfo, ChatModel } from '../../types';
import Tooltip from '../Tooltip';
import { BrainCircuit, Zap } from 'lucide-react';

const models: ModelInfo[] = [
    { id: 'gemini-2.5-flash', name: 'Kalina 2.5 Flash', description: 'Optimized for speed and efficiency.' },
    { id: 'gemini-2.5-pro', name: 'Kalina 2.5 Pro', description: 'Advanced capabilities for complex tasks.' },
    { id: 'gemini-2.5-flash-lite', name: 'Kalina 2.5 Flash Lite', description: 'A lighter, faster version for quick responses.' },
    { id: 'gemini-2.0-flash', name: 'Kalina 2.0 Flash', description: 'Previous generation Flash model.' },
    { id: 'gemini-2.0-flash-lite', name: 'Kalina 2.0 Flash Lite', description: 'Lightweight version of the 2.0 Flash model.' },
];

const ModelInfoDisplay: React.FC<{ modelId: ChatModel }> = ({ modelId }) => {
    const model = models.find(m => m.id === modelId);
    if (!model) return null;

    const isPro = model.id === 'gemini-2.5-pro';
    const Icon = isPro ? BrainCircuit : Zap;
    const displayName = model.name.replace('Kalina ', '');

    return (
        <Tooltip content={
            <div className="text-left">
                <p className="font-bold">{model.name}</p>
                <p>{model.description}</p>
            </div>
        } position="bottom" align="left">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 dark:text-gray-500 font-medium cursor-help">
                <Icon className={`h-3.5 w-3.5 ${isPro ? 'text-purple-500' : 'text-amber-500'}`} />
                <span>{displayName}</span>
            </div>
        </Tooltip>
    );
};

export default ModelInfoDisplay;