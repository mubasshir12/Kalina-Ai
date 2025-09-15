
import React, { useState, useEffect } from 'react';
import { KeyRound, X, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSetApiKey: (key: string) => void;
  onClose: () => void;
  currentApiKey?: string | null;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSetApiKey, onClose, currentApiKey }) => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setKeyInput(currentApiKey || '');
      setError('');
    }
  }, [isOpen, currentApiKey]);

  const handleSubmit = () => {
    if (!keyInput.trim()) {
      setError('API key cannot be empty.');
      return;
    }
    setError('');
    onSetApiKey(keyInput.trim());
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300" 
      onClick={!currentApiKey ? undefined : onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-gradient-to-br dark:from-[#2a2a2e] dark:to-[#1e1f22] rounded-2xl shadow-2xl p-8 space-y-6 transform transition-all duration-300 animate-fade-in-up" 
        onClick={(e) => e.stopPropagation()}
      >
        
        {currentApiKey && (
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full text-neutral-500 dark:text-gray-400 hover:bg-neutral-100 dark:hover:bg-gray-700 transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        )}

        <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 mb-4 bg-amber-100/80 dark:bg-amber-900/40 rounded-full border-2 border-amber-200 dark:border-amber-800/60">
              <KeyRound className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-gray-200">{currentApiKey ? 'Update' : 'Enter'} Your API Key</h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-gray-400">
                Provide your Google Gemini API key to start. It will be stored securely in your browser.
            </p>
        </div>
        
        <div className="space-y-3 text-left text-sm text-neutral-700 dark:text-gray-300">
            <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-neutral-100 dark:bg-gray-700/60 text-neutral-600 dark:text-gray-300">1</div>
                <div>
                  <span className="font-semibold">Go to Google AI Studio</span>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium hover:underline text-xs">
                      aistudio.google.com <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
            </div>
             <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-neutral-100 dark:bg-gray-700/60 text-neutral-600 dark:text-gray-300">2</div>
                <p><span className="font-semibold">Click "Create API key"</span> in a new or existing project.</p>
            </div>
             <div className="flex items-start gap-3">
                <div className="mt-1 flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-neutral-100 dark:bg-gray-700/60 text-neutral-600 dark:text-gray-300">3</div>
                <p><span className="font-semibold">Copy the key</span> and paste it into the field below.</p>
            </div>
        </div>
        
        <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-gray-500 pointer-events-none" />
            <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Paste your Gemini API key here"
                className="w-full bg-neutral-100 dark:bg-gray-800/50 border-2 border-neutral-200 dark:border-gray-700 rounded-lg py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/80 focus:border-amber-500 dark:focus:border-amber-500 text-neutral-800 dark:text-gray-200 transition-colors"
            />
        </div>
        {error && <p className="text-red-500 text-xs text-center -mt-3">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
             {currentApiKey && (
                 <button
                    onClick={onClose}
                    className="w-full px-6 py-3 bg-neutral-200 dark:bg-gray-700 text-neutral-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-neutral-300 dark:hover:bg-gray-600 transition-colors"
                >
                    Cancel
                </button>
            )}
            <button
                onClick={handleSubmit}
                className="w-full px-6 py-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all duration-300 shadow-lg hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-[#1e1f22]"
            >
                {currentApiKey ? 'Update Key' : 'Save & Continue'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
