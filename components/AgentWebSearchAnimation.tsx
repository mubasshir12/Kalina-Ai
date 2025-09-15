import React from 'react';
import { Globe } from 'lucide-react';

interface AgentWebSearchAnimationProps {
    statusMessage?: string;
}

const AgentWebSearchAnimation: React.FC<AgentWebSearchAnimationProps> = ({ statusMessage }) => {
    return (
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Globe className="w-4 h-4 animate-pulse" />
            <span className="font-semibold">{statusMessage || 'Searching the web...'}</span>
        </div>
    );
};

export default AgentWebSearchAnimation;