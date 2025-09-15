import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { Tool } from '../types';
import { tools } from './ChatInput';

interface ToolSelectionModalProps {
    selectedTool: Tool;
    onToolChange: (tool: Tool) => void;
    isJumperVisible?: boolean;
}

const ToolSelectionModal: React.FC<ToolSelectionModalProps> = ({ selectedTool, onToolChange, isJumperVisible }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const selectedToolObject = tools.find(t => t.id === selectedTool) || tools[0];
    const SelectedIcon = selectedToolObject.icon;

    return (
        <div ref={selectorRef} className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="flex items-center gap-2 px-3 py-1.5 text-neutral-700 dark:text-gray-300 bg-neutral-100 dark:bg-[#2E2F33] border border-neutral-300 dark:border-gray-600 rounded-xl hover:bg-neutral-200 dark:hover:bg-gray-700/70 transition-colors"
            >
                <SelectedIcon className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                <span className={`font-medium leading-none transition-all duration-200 ${isJumperVisible ? 'text-xs' : 'text-sm'}`}>
                    {selectedToolObject.name}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div 
                    className="absolute bottom-full mb-2 w-64 bg-white dark:bg-[#2E2F33] border border-neutral-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-20"
                >
                    {tools.map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => {
                                onToolChange(tool.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left p-3 text-neutral-800 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors ${
                                selectedTool === tool.id ? 'bg-neutral-100 dark:bg-gray-700/70' : ''
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <tool.icon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-sm">{tool.name}</p>
                                    <p className="text-xs text-neutral-500 dark:text-gray-400">{tool.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ToolSelectionModal;
