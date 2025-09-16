import React, { useRef } from 'react';
import { BrainCircuit, BarChart3, Terminal } from 'lucide-react';
import { ConsoleMode } from '../types';
import { IS_DEV_CONSOLE_ENABLED } from '../config';
import { useDraggableSheet } from '../hooks/useDraggableSheet';

interface MenuSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onShowMemory: () => void;
    onShowUsage: () => void;
    consoleMode: ConsoleMode;
    setConsoleMode: (mode: ConsoleMode) => void;
}

const MenuSheet: React.FC<MenuSheetProps> = ({
    isOpen,
    onClose,
    onShowMemory,
    onShowUsage,
    consoleMode,
    setConsoleMode
}) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const { sheetStyle, handleRef } = useDraggableSheet(sheetRef, onClose, isOpen);

    const handleLinkClick = (action: () => void) => {
        action();
        onClose();
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1e1f22] rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? '' : 'translate-y-full'}`}
                style={isOpen ? sheetStyle : {}}
                role="dialog"
                aria-modal="true"
            >
                <div ref={handleRef} className="py-4 cursor-grab active:cursor-grabbing">
                    <div className="w-10 h-1.5 bg-neutral-300 dark:bg-gray-600 rounded-full mx-auto" />
                </div>
                <div className="px-4 pb-4">
                    <nav className="space-y-1">
                        <button onClick={() => handleLinkClick(onShowUsage)} className="w-full flex items-center gap-4 p-3 text-left text-base font-medium text-neutral-700 dark:text-gray-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-gray-800/60 transition-colors">
                            <BarChart3 className="h-6 w-6 text-neutral-500 dark:text-gray-400" />
                            <span>Usage Statistics</span>
                        </button>
                        <button onClick={() => handleLinkClick(onShowMemory)} className="w-full flex items-center gap-4 p-3 text-left text-base font-medium text-neutral-700 dark:text-gray-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-gray-800/60 transition-colors">
                            <BrainCircuit className="h-6 w-6 text-neutral-500 dark:text-gray-400" />
                            <span>Memory Management</span>
                        </button>
                        {IS_DEV_CONSOLE_ENABLED && (
                            <>
                                <div className="border-t border-neutral-200 dark:border-gray-600 my-2" />
                                <div className="p-3 text-neutral-700 dark:text-gray-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-gray-800/60 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <Terminal className="h-6 w-6 text-neutral-500 dark:text-gray-400" />
                                        <div className="flex-1">
                                            <span className="text-base font-medium">Developer Console</span>
                                            <p className="text-xs text-neutral-500 dark:text-gray-400">
                                                {consoleMode === 'auto' ? 'Auto-shows on error' : 'Always visible'}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setConsoleMode(consoleMode === 'auto' ? 'manual' : 'auto')}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-[#1e1f22] ${consoleMode === 'manual' ? 'bg-amber-600' : 'bg-neutral-300 dark:bg-gray-600'}`}
                                            role="switch"
                                            aria-checked={consoleMode === 'manual'}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${consoleMode === 'manual' ? 'translate-x-5' : 'translate-x-0'}`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </nav>
                </div>
            </div>
        </>
    );
};

export default MenuSheet;