
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ChatModel, ModelInfo } from '../types';

interface ModelSelectorProps {
    models: ModelInfo[];
    selectedChatModel: ChatModel;
    onSelectChatModel: (model: ChatModel) => void;
    apiKey: string | null;
    onOpenApiKeyModal: () => void;
    isJumperVisible?: boolean;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
    models,
    selectedChatModel,
    onSelectChatModel,
    apiKey,
    onOpenApiKeyModal,
    isJumperVisible,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

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

    useEffect(() => {
        if (isOpen && selectorRef.current) {
            const buttonRect = selectorRef.current.getBoundingClientRect();
            const dropdownWidth = 256; // w-64 is 16rem = 256px
            const viewportWidth = window.innerWidth;
            const margin = 8; // a small margin from viewport edges

            const style: React.CSSProperties = {};

            // Default is left-aligned. Check if it overflows right.
            if (buttonRect.left + dropdownWidth > viewportWidth - margin) {
                // Not enough space right. Try aligning to the right of the button.
                if (buttonRect.right - dropdownWidth > margin) {
                    style.right = 0;
                } else {
                    // Not enough space on the left either. Center it in the viewport.
                    const centeredLeft = (viewportWidth - dropdownWidth) / 2;
                    // The 'left' style is relative to the button, so adjust.
                    style.left = centeredLeft - buttonRect.left;
                }
            } else {
                // Enough space on the right, align left.
                style.left = 0;
            }
            
            setDropdownStyle(style);
        }
    }, [isOpen]);

    const selectedModelObject = models.find(m => m.id === selectedChatModel) || models[0];

    const maskApiKey = (key: string | null): string => {
        if (!key || key.length < 8) return 'Not set';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };

    return (
        <div ref={selectorRef} className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-200/50 dark:bg-gray-800/50 rounded-xl text-neutral-800 dark:text-gray-200 hover:bg-neutral-300/50 dark:hover:bg-gray-700/70 transition-colors"
            >
                <span className={`font-semibold whitespace-nowrap text-amber-600 dark:text-amber-400 transition-all duration-200 ${isJumperVisible ? 'text-xs' : 'text-sm'}`}>{selectedModelObject.name.replace('Kalina ', '')}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div 
                    className="absolute bottom-full mb-2 w-64 bg-white dark:bg-[#2E2F33] border border-neutral-200 dark:border-gray-600 rounded-lg shadow-xl overflow-hidden z-20"
                    style={dropdownStyle}
                >
                    {models.map(model => (
                        <button
                            key={model.id}
                            onClick={() => {
                                onSelectChatModel(model.id);
                                setIsOpen(false);
                            }}
                            className={`w-full text-left p-3 text-neutral-800 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors ${
                                selectedChatModel === model.id ? 'bg-neutral-100 dark:bg-gray-700/70' : ''
                            }`}
                        >
                            <p className="font-semibold text-sm">{model.name}</p>
                            <p className="text-xs text-neutral-500 dark:text-gray-400">{model.description}</p>
                        </button>
                    ))}
                    <div className="border-t border-neutral-200 dark:border-gray-600 my-1" />
                    <button
                        onClick={() => {
                            onOpenApiKeyModal();
                            setIsOpen(false);
                        }}
                        className="w-full text-left p-3 text-neutral-800 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors flex items-center gap-2"
                    >
                        <div>
                            <p className="font-semibold text-sm">Update API Key</p>
                            <p className="text-xs text-neutral-500 dark:text-gray-400 font-mono">{maskApiKey(apiKey)}</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};

export default ModelSelector;