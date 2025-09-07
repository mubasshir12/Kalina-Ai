import React, { useState, useEffect, useRef } from 'react';
import { ConsoleLogEntry, ConsoleMode } from '../types';
import { useDebug } from '../contexts/DebugContext';
import { getHintForError } from '../utils/errorHints';
import { getAiHelpForError } from '../services/debugService';
import { X, Trash2, Copy, Check, Info, Wand2, LoaderCircle, ChevronDown } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useDraggableSheet } from '../hooks/useDraggableSheet';

interface DevConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    mode: ConsoleMode;
}

const LogEntryItem: React.FC<{ log: ConsoleLogEntry }> = ({ log }) => {
    const [isCopied, setIsCopied] = useState(false);
    const [aiHelp, setAiHelp] = useState<string>('');
    const [isGettingHelp, setIsGettingHelp] = useState(false);
    const [showLangPrompt, setShowLangPrompt] = useState(false);
    const [isAiHelpVisible, setIsAiHelpVisible] = useState(false);
    const hint = getHintForError(log.message);

    const handleCopy = () => {
        const textToCopy = `[${log.timestamp}] ${log.message}\n\nStack Trace:\n${log.stack || 'N/A'}`;
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const handleGetAiHelp = async (language: 'English' | 'Hinglish') => {
        setShowLangPrompt(false);
        setIsGettingHelp(true);
        setIsAiHelpVisible(true);
        const helpText = await getAiHelpForError({ message: log.message, stack: log.stack }, language);
        setAiHelp(helpText);
        setIsGettingHelp(false);
    };

    return (
        <div className="p-3 border-b border-neutral-200 dark:border-gray-700/50">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                    <span className="text-xs text-neutral-400 dark:text-gray-500 font-mono">{log.timestamp}</span>
                    <p className="text-sm text-red-600 dark:text-red-400 font-semibold break-words whitespace-pre-wrap">{log.message}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleCopy} className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-700 transition-colors">
                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-neutral-500 dark:text-gray-400" />}
                    </button>
                    {!hint && (
                        <button onClick={() => setShowLangPrompt(true)} disabled={isGettingHelp} className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                            {isGettingHelp ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-amber-500 dark:text-amber-400" />}
                        </button>
                    )}
                </div>
            </div>

            {hint && (
                <details className="mt-2 group">
                    <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer flex items-center gap-1 font-medium list-none [&::-webkit-details-marker]:hidden">
                        <Info className="h-4 w-4" />
                        <span>Show Hint for "{hint.title}"</span>
                        <ChevronDown className="h-4 w-4 ml-auto transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-200 mb-1">{hint.title}</h4>
                        <p className="text-sm text-neutral-700 dark:text-gray-300 mb-2">{hint.description}</p>
                        <div>
                            <p className="text-xs font-semibold text-neutral-600 dark:text-gray-400">Suggested Solution:</p>
                            <p className="font-mono text-xs bg-neutral-100 dark:bg-gray-800 p-1.5 rounded mt-1 text-neutral-700 dark:text-gray-300 whitespace-pre-wrap">{hint.solution}</p>
                        </div>
                    </div>
                </details>
            )}

            {log.stack && (
                <details className="mt-2">
                    <summary className="text-xs text-neutral-500 dark:text-gray-400 cursor-pointer">Show Stack Trace</summary>
                    <pre className="mt-1 p-2 bg-neutral-100 dark:bg-gray-800/50 rounded-md text-xs text-neutral-600 dark:text-gray-300 whitespace-pre-wrap break-all">
                        {log.stack}
                    </pre>
                </details>
            )}
             {showLangPrompt && !isGettingHelp && (
                <div className="mt-2 p-2 bg-neutral-100 dark:bg-gray-800/60 rounded-lg border border-neutral-200 dark:border-gray-700/50">
                    <p className="text-xs font-semibold text-neutral-700 dark:text-gray-300 mb-2">Choose response language:</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleGetAiHelp('English')} className="flex-1 px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-gray-200 bg-white dark:bg-gray-700/50 rounded-md hover:bg-neutral-200 dark:hover:bg-gray-600/50 border border-neutral-300 dark:border-gray-600 transition-colors">English</button>
                        <button onClick={() => handleGetAiHelp('Hinglish')} className="flex-1 px-3 py-1.5 text-xs font-medium text-neutral-800 dark:text-gray-200 bg-white dark:bg-gray-700/50 rounded-md hover:bg-neutral-200 dark:hover:bg-gray-600/50 border border-neutral-300 dark:border-gray-600 transition-colors">Hinglish</button>
                    </div>
                </div>
            )}
            {isAiHelpVisible && (
                <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200 mb-2">AI Diagnosis</h4>
                    <p className="text-xs text-neutral-500 dark:text-gray-400 mb-2 font-mono bg-neutral-100 dark:bg-gray-800 p-1.5 rounded-md overflow-x-auto">
                        Diagnosed: {log.message}
                    </p>
                    {isGettingHelp ? (
                        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            <span>Analyzing error...</span>
                        </div>
                    ) : (
                        <div className="text-sm text-neutral-800 dark:text-gray-200 prose prose-sm dark:prose-invert max-w-none">
                           {/* FIX: Provide the required 'onContentUpdate' prop and omit the optional 'setCodeForPreview' prop. */}
                           <MarkdownRenderer content={aiHelp} onContentUpdate={() => {}} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


const DevConsole: React.FC<DevConsoleProps> = ({ isOpen, onClose }) => {
    const { logs, clearLogs } = useDebug();
    const consoleBodyRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const { sheetStyle, handleRef } = useDraggableSheet(sheetRef, onClose, isOpen);

    useEffect(() => {
        if (logs.length > 0) {
            consoleBodyRef.current?.scrollTo({ top: consoleBodyRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [logs]);
    
    return (
        <div className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} aria-hidden="true">
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1e1f22] rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? '' : 'translate-y-full'} h-[60vh] flex flex-col`}
                style={isOpen ? sheetStyle : {}}
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
            >
                <header ref={handleRef} className="p-4 border-b border-neutral-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 cursor-grab active:cursor-grabbing">
                    <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200">Developer Console</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={clearLogs} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-gray-700 transition-colors" aria-label="Clear logs">
                            <Trash2 className="h-5 w-5 text-neutral-500 dark:text-gray-400" />
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-gray-700 transition-colors" aria-label="Close console">
                            <X className="h-5 w-5 text-neutral-500 dark:text-gray-400" />
                        </button>
                    </div>
                </header>
                <div ref={consoleBodyRef} className="flex-1 overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-neutral-400 dark:text-gray-500">
                            No errors logged yet.
                        </div>
                    ) : (
                        logs.map(log => <LogEntryItem key={log.id} log={log} />)
                    )}
                </div>
            </div>
        </div>
    );
};

export default DevConsole;