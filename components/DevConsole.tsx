import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ConsoleLogEntry, ConsoleMode, TokenLog } from '../types';
import { getHintForError } from '../utils/errorHints';
import { getAiHelpForError } from '../services/debugService';
import { X, Trash2, Copy, Check, Info, Wand2, LoaderCircle, ChevronDown } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useDraggableSheet } from '../hooks/useDraggableSheet';
import { useDebug } from '../contexts/DebugContext';
import StoragePanel from './StoragePanel';
import WordManagementPanel from './WordManagementPanel';

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

    const messageColorClass = {
        'error': 'text-red-600 dark:text-red-400',
        'warn': 'text-yellow-600 dark:text-yellow-400',
        'log': 'text-neutral-800 dark:text-gray-300'
    }[log.level];

    return (
        <div className="p-3 border-b border-neutral-200 dark:border-gray-700/50">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <span className="text-xs text-neutral-400 dark:text-gray-500 font-mono">{log.timestamp}</span>
                    <div className={`dev-console-log text-sm ${messageColorClass} break-words`}>
                        <MarkdownRenderer content={log.message} />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={handleCopy} className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-700 transition-colors">
                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-neutral-500 dark:text-gray-400" />}
                    </button>
                    {log.level === 'error' && !hint && (
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
                           <MarkdownRenderer content={aiHelp} />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const TokenLogPanel: React.FC<{ logs: TokenLog[] }> = ({ logs }) => {
    const totalTokens = useMemo(() => logs.reduce((acc, log) => acc + log.totalTokens, 0), [logs]);

    if (logs.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-neutral-400 dark:text-gray-500 p-4 text-center">
                No token usage logged yet.
            </div>
        );
    }

    return (
        <div className="text-sm font-mono">
            <div className="p-3 sticky top-0 bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm border-b border-neutral-200 dark:border-gray-700">
                <p className="font-bold text-neutral-800 dark:text-gray-200">Total Logged Tokens: {totalTokens.toLocaleString()}</p>
            </div>
            <table className="w-full text-left">
                <thead className="text-xs text-neutral-500 dark:text-gray-400 uppercase bg-neutral-50 dark:bg-gray-800/50">
                    <tr>
                        <th className="px-3 py-2">Timestamp</th>
                        <th className="px-3 py-2">Source</th>
                        <th className="px-3 py-2 text-right">Input</th>
                        <th className="px-3 py-2 text-right">Output</th>
                        <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="text-xs text-neutral-700 dark:text-gray-300">
                    {logs.map(log => (
                        <tr key={log.id} className="border-b border-neutral-100 dark:border-gray-700/50 hover:bg-neutral-50 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-2 text-neutral-400 dark:text-gray-500">{log.timestamp}</td>
                            <td className="px-3 py-2 font-semibold">{log.source}</td>
                            <td className="px-3 py-2 text-right">{log.inputTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right">{log.outputTokens.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right font-bold">{log.totalTokens.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

interface DevConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    mode: ConsoleMode;
    logs: ConsoleLogEntry[];
    clearLogs: () => void;
    onNavigateToAnalysis: () => void;
}

const DevConsole: React.FC<DevConsoleProps> = ({ isOpen, onClose, mode, logs, clearLogs, onNavigateToAnalysis }) => {
    const { tokenLogs } = useDebug();
    const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'tokens' | 'words' | 'storage'>('all');
    const consoleBodyRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const { sheetStyle, handleRef } = useDraggableSheet(sheetRef, onClose, isOpen);

    const errorCount = useMemo(() => logs.filter(l => l.level === 'error').length, [logs]);
    const warningCount = useMemo(() => logs.filter(l => l.level === 'warn').length, [logs]);
    
    // Fix: Define the filteredLogs variable to correctly filter logs based on the selected tab.
    const filteredLogs = useMemo(() => {
        if (filter === 'all') {
            return logs;
        }
        // The filter state can be 'error' or 'warn', which directly maps to log levels.
        return logs.filter(log => log.level === filter);
    }, [logs, filter]);

    const TABS: { id: typeof filter; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'warn', label: 'Warnings' },
        { id: 'error', label: 'Errors' },
        { id: 'tokens', label: 'Tokens' },
        { id: 'words', label: 'Words' },
        { id: 'storage', label: 'Storage' },
    ];
    
    const counts = { all: logs.length, error: errorCount, warn: warningCount, tokens: tokenLogs.length, words: '', storage: '' };

    const handleNavigate = () => {
        onNavigateToAnalysis();
        onClose();
    };

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
                <div className="flex-shrink-0 border-b border-neutral-200 dark:border-gray-700 px-2 sm:px-4">
                    <div className="flex items-center gap-2 sm:gap-4 -mb-px overflow-x-auto scrollbar-hide">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id)}
                                className={`flex-shrink-0 py-3 px-1 sm:px-2 text-sm font-semibold border-b-2 transition-colors ${
                                    filter === tab.id
                                        ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                        : 'border-transparent text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-gray-200 hover:border-neutral-300 dark:hover:border-gray-500'
                                }`}
                            >
                                {tab.label} {counts[tab.id] !== '' && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                                    filter === tab.id
                                        ? 'bg-amber-100 dark:bg-amber-900/40'
                                        : 'bg-neutral-100 dark:bg-gray-700/50'
                                }`}>{counts[tab.id]}</span>}
                            </button>
                        ))}
                    </div>
                </div>
                <div ref={consoleBodyRef} className="flex-1 overflow-y-auto">
                   {filter === 'storage' ? (
                       <StoragePanel excludeStores={['words']} />
                   ) : filter === 'tokens' ? (
                       <TokenLogPanel logs={tokenLogs} />
                   ) : filter === 'words' ? (
                       <WordManagementPanel onNavigateToAnalysis={handleNavigate} />
                   ) : filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-neutral-400 dark:text-gray-400 p-4 text-center">
                            {filter === 'all' ? 'No logs yet.' : `No ${filter}s logged.`}
                        </div>
                    ) : (
                        filteredLogs.map(log => <LogEntryItem key={log.id} log={log} />)
                    )}
                </div>
            </div>
        </div>
    );
};

export default DevConsole;