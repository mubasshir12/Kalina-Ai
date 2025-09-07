
import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Play } from 'lucide-react';
import CodePreviewModal from './CodePreviewModal';

declare const hljs: any;

interface CodeBlockProps {
    language: string;
    code: string;
    isStreaming?: boolean;
    setCodeForPreview?: (data: { code: string; language: string; } | null) => void;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code, isStreaming, setCodeForPreview }) => {
    const [isCopied, setIsCopied] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        // When streaming is finished, or code is updated, apply highlighting.
        if (codeRef.current && !isStreaming && typeof hljs !== 'undefined') {
            hljs.highlightElement(codeRef.current);
        }
    }, [isStreaming, code, language]);

    const isRunnable = setCodeForPreview && ['html', 'htmlbars', 'javascript', 'css'].includes(language.toLowerCase());

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy code: ', err);
        }
    };
    
    const handleRunClick = () => {
        setCodeForPreview?.({
            code: code,
            language: language,
        });
    };

    return (
        <>
            <div className="bg-neutral-100 dark:bg-[#1e1f22] rounded-lg my-4 border border-neutral-200 dark:border-gray-700 overflow-hidden">
                <div className="flex justify-between items-center px-4 py-2 bg-neutral-200 dark:bg-gray-800/50">
                    <span className="text-xs font-sans text-neutral-500 dark:text-gray-400 uppercase font-semibold">
                        {language || 'code'}
                    </span>
                    <div className="flex items-center gap-4">
                        {isRunnable && (
                             <button
                                onClick={handleRunClick}
                                className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                aria-label="Run code"
                            >
                                <Play className="h-3.5 w-3.5" />
                                <span>Run</span>
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-gray-300 hover:text-neutral-900 dark:hover:text-white transition-colors"
                            aria-label={isCopied ? 'Copied' : 'Copy code'}
                        >
                            {isCopied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 text-green-500" />
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
                <pre className="p-4 text-sm whitespace-pre overflow-x-auto code-scrollbar">
                    <code ref={codeRef} className={`font-mono hljs language-${language}`}>
                        {code}
                    </code>
                </pre>
            </div>
        </>
    );
};

export default CodeBlock;
