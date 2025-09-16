


import React, { useState } from 'react';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown } from 'lucide-react';

const stripMarkdown = (markdown: string): string => {
    if (!markdown) return '';
    return markdown
      .replace(/^#+\s/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\[\d+\]/g, '')
      .trim();
};

interface MessageToolbarProps {
    id: string;
    content: string;
    onRetry?: () => void;
}

const MessageToolbar: React.FC<MessageToolbarProps> = ({ id, content, onRetry }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

    const handleCopy = () => {
        if (content) {
            const plainText = stripMarkdown(content);
            navigator.clipboard.writeText(plainText);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        }
    };

    return (
        <div className="mt-3 flex items-center gap-2 text-neutral-500 dark:text-gray-400">
            {content && (
                <>
                    <button onClick={handleCopy} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Copy message">
                        {isCopied ? <Check className="h-5 w-5 text-green-500 dark:text-green-400" /> : <Copy className="h-5 w-5" />}
                    </button>
                </>
            )}
            {onRetry && (
                <button onClick={onRetry} className="p-1.5 hover:bg-neutral-200 dark:hover:bg-gray-700 rounded-full transition-colors" aria-label="Retry">
                    <RefreshCw className="h-5 w-5" />
                </button>
            )}
            {content && (
                <>
                    <button 
                        onClick={() => {
                            const newFeedback = feedback === 'up' ? null : 'up';
                            setFeedback(newFeedback);
                            if (newFeedback === 'up') console.log('Feedback: Thumbs Up', { messageId: id, content: stripMarkdown(content) });
                        }}
                        className={`p-1.5 hover:bg-neutral-200 dark:hover:bg-gray-700 rounded-full transition-colors ${feedback === 'up' ? 'text-amber-500 dark:text-amber-400' : ''}`}
                        aria-label="Thumbs up"
                    >
                        <ThumbsUp className="h-5 w-5" />
                    </button>
                    <button 
                        onClick={() => {
                            const newFeedback = feedback === 'down' ? null : 'down';
                            setFeedback(newFeedback);
                            if (newFeedback === 'down') console.log('Feedback: Thumbs Down', { messageId: id, content: stripMarkdown(content) });
                        }}
                        className={`p-1.5 hover:bg-neutral-200 dark:hover:bg-gray-700 rounded-full transition-colors ${feedback === 'down' ? 'text-amber-500 dark:text-amber-400' : ''}`}
                        aria-label="Thumbs down"
                    >
                        <ThumbsDown className="h-5 w-5" />
                    </button>
                </>
            )}
        </div>
    );
};

export default MessageToolbar;