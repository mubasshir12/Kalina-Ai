import React from 'react';
import { ChatModel, ChatMessage } from '../../types';
import ModelInfoDisplay from './ModelInfoDisplay';
import Tooltip from '../Tooltip';

interface MessageMetadataProps extends Pick<ChatMessage, 'modelUsed' | 'inputTokens' | 'outputTokens' | 'generationTime' | 'timestamp'> {}

const MessageMetadata: React.FC<MessageMetadataProps> = ({ modelUsed, inputTokens, outputTokens, generationTime, timestamp }) => {
    const tokenParts: string[] = [];
    if (typeof inputTokens === 'number') tokenParts.push(`${inputTokens} in`);
    if (typeof outputTokens === 'number') tokenParts.push(`${outputTokens} out`);

    const hasModelInfo = modelUsed || (generationTime && generationTime > 0);

    if (!hasModelInfo && !timestamp && tokenParts.length === 0) {
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
                    align="left"
                >
                    <span className="cursor-help">Tokens: {tokenParts.join(' / ')}</span>
                </Tooltip>
            )}
            {hasModelInfo && (
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
                            align="left"
                        >
                            <span className="cursor-help">{`${(generationTime / 1000).toFixed(1)}s`}</span>
                        </Tooltip>
                    )}
                </div>
            )}
            {timestamp && (
                <Tooltip
                    content={
                        <div>
                            <div>Response generated at:</div>
                            <div>{new Date(timestamp).toLocaleString(undefined, {
                                dateStyle: 'full',
                                timeStyle: 'medium',
                            })}</div>
                        </div>
                    }
                    position="bottom"
                    align="left"
                >
                    <span className="cursor-help">
                        {new Date(timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                        })}
                    </span>
                </Tooltip>
            )}
        </div>
    );
};

export default MessageMetadata;
