import React from 'react';
import { ChatModel } from '../../types';
import ModelInfoDisplay from './ModelInfoDisplay';
import Tooltip from '../Tooltip';

interface MessageMetadataProps {
    modelUsed?: ChatModel;
    inputTokens?: number;
    outputTokens?: number;
    generationTime?: number;
}

const MessageMetadata: React.FC<MessageMetadataProps> = ({ modelUsed, inputTokens, outputTokens, generationTime }) => {
    const tokenParts: string[] = [];
    if (typeof inputTokens === 'number') tokenParts.push(`${inputTokens} in`);
    if (typeof outputTokens === 'number') tokenParts.push(`${outputTokens} out`);

    if (!modelUsed && !generationTime && tokenParts.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 text-xs text-neutral-400 dark:text-gray-500 font-mono flex flex-col items-start gap-1">
            {tokenParts.length > 0 && (
                <Tooltip 
                    content={
                        <div>
                            <div>Input tokens (your prompt)</div>
                            <div>Output tokens (AI's response)</div>
                        </div>
                    } 
                    position="bottom"
                >
                    <span className="cursor-help">Tokens: {tokenParts.join(' / ')}</span>
                </Tooltip>
            )}
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap">
                {modelUsed && <ModelInfoDisplay modelId={modelUsed} />}
                {generationTime && generationTime > 0 && (
                    <Tooltip 
                        content={
                            <div>
                                <div>Total time from request to</div>
                                <div>full response</div>
                            </div>
                        } 
                        position="bottom"
                    >
                        <span className="cursor-help">{`${(generationTime / 1000).toFixed(1)}s`}</span>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};

export default MessageMetadata;