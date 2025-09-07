import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertTriangle, Terminal, RotateCcw, ChevronDown, ChevronUp, Laptop, Tablet, Smartphone } from 'lucide-react';
import { ConsoleLog } from '../types';

interface CodePreviewModalProps {
    code: string;
    language: string;
    onClose: () => void;
}

type Viewport = 'desktop' | 'tablet' | 'mobile';

const CodePreviewModal: React.FC<CodePreviewModalProps> = ({ code, language, onClose }) => {
    const [logs, setLogs] = useState<ConsoleLog[]>([]);
    const [isConsoleOpen, setIsConsoleOpen] = useState(false);
    const [iframeKey, setIframeKey] = useState(0);
    const [view, setView] = useState<Viewport>('desktop');
    const consoleEndRef = useRef<HTMLDivElement>(null);
    
    const errorCount = useMemo(() => logs.filter(log => log.level === 'error').length, [logs]);
    const hasError = errorCount > 0;

    useEffect(() => {
        if (hasError) {
            setIsConsoleOpen(true);
        }
    }, [hasError]);
    
    useEffect(() => {
        const checkDevice = () => {
            if (window.matchMedia("(min-width: 1024px)").matches) {
                setView('desktop');
            } else if (window.matchMedia("(min-width: 768px)").matches) {
                setView('tablet');
            } else {
                setView('mobile');
            }
        };
        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const { type, level, message } = event.data;
            if (type === 'log' || type === 'error') {
                 setLogs(prevLogs => [...prevLogs, {
                    level: level || (type === 'error' ? 'error' : 'log'),
                    message,
                    timestamp: new Date().toLocaleTimeString()
                }]);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        // Automatically scroll to the latest log message.
        if (isConsoleOpen) {
            consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, isConsoleOpen]);
    
    const iframeContent = useMemo(() => {
        const headInject = language.toLowerCase() === 'css' ? `<style>${code}</style>` : '';
        let bodyInject = '';

        switch (language.toLowerCase()) {
            case 'javascript':
                bodyInject = `<script>${code}<\/script>`;
                break;
            case 'html':
            case 'htmlbars':
                bodyInject = code;
                break;
            default:
                bodyInject = ``; // CSS is in head, nothing to inject here
        }

        return `
            <!DOCTYPE html>
            <html>
                <head>
                    ${headInject}
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            padding: 1rem; color: #111827; 
                        }
                        body.dark { background-color: #111827; color: #f9fafb; }
                    </style>
                    <script>
                        // Theme sync
                        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                            document.body.classList.add('dark');
                        }
                        // Capture console logs
                        const originalConsole = {};
                        ['log', 'warn', 'error'].forEach(level => {
                            originalConsole[level] = console[level];
                            console[level] = (...args) => {
                                const message = args.map(arg => {
                                    try {
                                        if (arg === undefined) return 'undefined';
                                        if (arg === null) return 'null';
                                        if (arg instanceof Error) return arg.stack || arg.toString();
                                        if (arg instanceof HTMLElement) {
                                            return \`HTMLElement <\${arg.tagName.toLowerCase()}>\`;
                                        }
                                        if (typeof arg === 'object') {
                                            const getCircularReplacer = () => {
                                                const seen = new WeakSet();
                                                return (key, value) => {
                                                    if (typeof value === 'object' && value !== null) {
                                                        if (seen.has(value)) {
                                                            return '[Circular Reference]';
                                                        }
                                                        seen.add(value);
                                                    }
                                                    return value;
                                                };
                                            };
                                            try {
                                                return JSON.stringify(arg, getCircularReplacer(), 2);
                                            } catch (e) {
                                                return 'Unserializable Object';
                                            }
                                        }
                                        return String(arg);
                                    } catch (e) {
                                        return 'Error formatting log message';
                                    }
                                }).join(' ');
                                window.parent.postMessage({ type: 'log', level, message }, '*');
                                originalConsole[level].apply(console, args);
                            };
                        });
                        // Capture runtime errors
                        window.onerror = (message, source, lineno, colno, error) => {
                            const errorMsg = error ? error.stack : \`\${message} (\${source}:\${lineno}:\${colno})\`;
                            window.parent.postMessage({ type: 'error', level: 'error', message: errorMsg }, '*');
                            return true;
                        };
                    <\/script>
                </head>
                <body>
                    ${bodyInject}
                </body>
            </html>
        `;
    }, [code, language]);
    
    const iframeDimensions: Record<Viewport, React.CSSProperties> = {
        desktop: { width: '100%', height: '100%' },
        tablet: { width: '768px', height: '1024px' },
        mobile: { width: '375px', height: '667px' },
    };

    const viewportButtons: { id: Viewport; icon: React.ElementType }[] = [
        { id: 'desktop', icon: Laptop },
        { id: 'tablet', icon: Tablet },
        { id: 'mobile', icon: Smartphone },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1e1f22] rounded-2xl shadow-xl w-full max-w-6xl h-[90vh] flex flex-col" role="dialog" onClick={(e) => e.stopPropagation()}>
                <header className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                            {viewportButtons.map(({ id, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setView(id)}
                                    className={`p-1.5 rounded-md transition-colors ${view === id ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700/50'}`}
                                    aria-label={`Switch to ${id} view`}
                                >
                                    <Icon className="h-5 w-5" />
                                </button>
                            ))}
                        </div>
                        {hasError && <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-medium rounded-full">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Error Detected</span>
                        </div>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setIframeKey(Date.now()); setLogs([]); }} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Refresh preview">
                            <RotateCcw className="h-5 w-5" />
                        </button>
                        <button onClick={onClose} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Close">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 p-2 sm:p-4 bg-gray-100 dark:bg-gray-900 flex items-center justify-center overflow-auto">
                        <iframe
                            key={iframeKey}
                            srcDoc={iframeContent}
                            title="Code Preview"
                            sandbox="allow-scripts allow-modals"
                            className="border-0 bg-white shadow-lg transition-all duration-300 max-w-full max-h-full"
                            style={iframeDimensions[view]}
                        />
                    </div>
                    <div className="flex flex-col border-t border-gray-200 dark:border-gray-700 w-full flex-shrink-0">
                        <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <Terminal className="h-4 w-4" />
                                <span>Console</span>
                                {errorCount > 0 && (
                                    <span className="ml-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full h-5 w-5">
                                        {errorCount}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => setIsConsoleOpen(prev => !prev)} className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800" aria-label={isConsoleOpen ? 'Collapse console' : 'Expand console'}>
                                {isConsoleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            </button>
                        </div>

                        {isConsoleOpen && (
                            <div className="h-48 p-2 overflow-y-auto text-xs font-mono bg-white dark:bg-[#131314]">
                                {logs.length === 0 && <div className="text-gray-400 dark:text-gray-500 p-2">Console is empty.</div>}
                                {logs.map((log, index) => (
                                    <div key={index} className={`p-1.5 border-b border-gray-100 dark:border-gray-800 ${log.level === 'error' ? 'text-red-600 dark:text-red-400' : log.level === 'warn' ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                        <div>
                                            <div className="text-gray-400 dark:text-gray-600 select-none mb-1">{log.timestamp}</div>
                                            <pre className="whitespace-pre-wrap break-words flex-1">{log.message}</pre>
                                        </div>
                                    </div>
                                ))}
                                <div ref={consoleEndRef} />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default CodePreviewModal;