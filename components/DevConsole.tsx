import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ConsoleLogEntry, ConsoleMode } from '../types';
import { getHintForError } from '../utils/errorHints';
import { getAiHelpForError } from '../services/debugService';
import { generateImage } from '../services/imageService';
import { X, Trash2, Copy, Check, Info, Wand2, LoaderCircle, ChevronDown, Image as ImageIcon } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { useDraggableSheet } from '../hooks/useDraggableSheet';

interface DevConsoleProps {
    isOpen: boolean;
    onClose: () => void;
    mode: ConsoleMode;
    logs: ConsoleLogEntry[];
    clearLogs: () => void;
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


const DevConsole: React.FC<DevConsoleProps> = ({ isOpen, onClose, logs, clearLogs }) => {
    const [activeTab, setActiveTab] = useState<'all' | 'error' | 'warn' | 'imageGen'>('all');
    const consoleBodyRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const { sheetStyle, handleRef } = useDraggableSheet(sheetRef, onClose, isOpen);

    // Image Generation State
    const [imagePrompt, setImagePrompt] = useState<string>('A photorealistic image of a cat wearing a tiny wizard hat, detailed, 4k');
    const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [imageModelId, setImageModelId] = useState<string>('imagen-4.0-generate-001');

    const errorCount = useMemo(() => logs.filter(l => l.level === 'error').length, [logs]);
    const warningCount = useMemo(() => logs.filter(l => l.level === 'warn').length, [logs]);
    
    const filteredLogs = useMemo(() => {
        if (activeTab === 'error') return logs.filter(l => l.level === 'error');
        if (activeTab === 'warn') return logs.filter(l => l.level === 'warn');
        return logs;
    }, [logs, activeTab]);

    useEffect(() => {
        if (filteredLogs.length > 0 && consoleBodyRef.current) {
            consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
        }
    }, [filteredLogs]);
    
    const handleGenerateImage = async () => {
        if (!imagePrompt.trim()) {
            setImageError("Prompt cannot be empty.");
            return;
        }
        setIsGeneratingImage(true);
        setGeneratedImage(null);
        setImageError(null);
        try {
            const imageB64 = await generateImage(imagePrompt, imageModelId);
            setGeneratedImage(imageB64);
        } catch (e: any) {
            setImageError(e.message || "An unknown error occurred during image generation.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const TABS: { id: 'all' | 'error' | 'warn' | 'imageGen'; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'error', label: 'Errors' },
        { id: 'warn', label: 'Warnings' },
        { id: 'imageGen', label: 'Image Gen' },
    ];
    
    const counts = { all: logs.length, error: errorCount, warn: warningCount };

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
                    <div className="flex items-center gap-2 sm:gap-4 -mb-px">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 px-1 sm:px-2 text-sm font-semibold border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                                        : 'border-transparent text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-gray-200 hover:border-neutral-300 dark:hover:border-gray-500'
                                }`}
                            >
                                {tab.label}
                                {(tab.id === 'all' || tab.id === 'error' || tab.id === 'warn') && (
                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                                        activeTab === tab.id
                                            ? 'bg-amber-100 dark:bg-amber-900/40'
                                            : 'bg-neutral-100 dark:bg-gray-700/50'
                                    }`}>{counts[tab.id]}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <div ref={consoleBodyRef} className="flex-1 overflow-y-auto">
                    {(activeTab === 'all' || activeTab === 'error' || activeTab === 'warn') ? (
                        <>
                            {filteredLogs.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-neutral-400 dark:text-gray-500 p-4 text-center">
                                    {activeTab === 'all' ? 'No logs yet.' : `No ${activeTab}s logged.`}
                                </div>
                            ) : (
                                filteredLogs.map(log => <LogEntryItem key={log.id} log={log} />)
                            )}
                        </>
                    ) : (
                        <div className="p-4 space-y-4">
                            <h3 className="text-base font-semibold text-neutral-700 dark:text-gray-300">Image Generation (Test Panel)</h3>
                             <div>
                                <label htmlFor="image-model-id" className="text-sm font-medium text-neutral-600 dark:text-gray-400">Model ID</label>
                                <input
                                    id="image-model-id"
                                    type="text"
                                    value={imageModelId}
                                    onChange={(e) => setImageModelId(e.target.value)}
                                    disabled={isGeneratingImage}
                                    className="mt-1 w-full p-2 bg-neutral-100 dark:bg-gray-800/60 border border-neutral-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                                    placeholder="e.g., imagen-4.0-generate-001"
                                />
                            </div>
                            <div>
                                <label htmlFor="image-prompt" className="text-sm font-medium text-neutral-600 dark:text-gray-400">Prompt</label>
                                <textarea
                                    id="image-prompt"
                                    rows={3}
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    disabled={isGeneratingImage}
                                    className="mt-1 w-full p-2 bg-neutral-100 dark:bg-gray-800/60 border border-neutral-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                                    placeholder="Describe the image you want to create..."
                                />
                            </div>
                            <button
                                onClick={handleGenerateImage}
                                disabled={isGeneratingImage}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors disabled:bg-amber-400 dark:disabled:bg-amber-800 disabled:cursor-not-allowed"
                            >
                                {isGeneratingImage ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                                {isGeneratingImage ? 'Generating...' : 'Generate Image'}
                            </button>

                            {imageError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-md text-red-700 dark:text-red-300 text-sm">
                                    {imageError}
                                </div>
                            )}
                            
                            <div className="mt-4">
                                {isGeneratingImage && (
                                     <div className="w-full aspect-square bg-neutral-100 dark:bg-gray-800 rounded-lg flex items-center justify-center animate-pulse">
                                        <span className="text-neutral-500 dark:text-gray-400">Generating...</span>
                                    </div>
                                )}
                                {generatedImage && (
                                    <div>
                                        <h4 className="text-sm font-medium text-neutral-600 dark:text-gray-400 mb-2">Result:</h4>
                                        <img
                                            src={`data:image/png;base64,${generatedImage}`}
                                            alt="Generated by AI"
                                            className="w-full rounded-lg border border-neutral-200 dark:border-gray-700"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DevConsole;