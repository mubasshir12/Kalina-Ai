import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';

interface FullScreenEditorProps {
    onBack: () => void;
    onSave: (newText: string) => void;
    initialText: string;
}

const FullScreenEditor: React.FC<FullScreenEditorProps> = ({ onBack, onSave, initialText }) => {
    const [text, setText] = useState(initialText);

    useEffect(() => {
        setText(initialText);
    }, [initialText]);

    const handleSave = () => {
        onSave(text);
    };

    return (
        <main className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-hidden h-full">
            {/* Header with only the title */}
            <div className="flex items-center mb-6 flex-shrink-0">
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-gray-200">
                    Editor
                </h1>
            </div>

            {/* Textarea filling the space, without a visible container */}
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 w-full bg-transparent text-gray-800 dark:text-gray-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 resize-none text-lg leading-relaxed"
                autoFocus
            />

            {/* Footer with action buttons */}
            <div className="flex-shrink-0 pt-4 flex justify-end items-center gap-3">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg bg-neutral-200 dark:bg-gray-700 text-neutral-800 dark:text-gray-200 hover:bg-neutral-300 dark:hover:bg-gray-600 transition-colors"
                >
                    <X className="h-4 w-4" /> Cancel
                </button>
                <button 
                    onClick={handleSave} 
                    className="flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                >
                    <Save className="h-4 w-4" /> Save & Close
                </button>
            </div>
        </main>
    );
};

export default FullScreenEditor;
