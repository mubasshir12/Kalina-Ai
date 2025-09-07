import React, { useState, useEffect } from 'react';
import { KeyRound } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center sm:justify-center z-50 p-4" onClick={!currentApiKey ? undefined : onClose}>
      <div className="w-full sm:max-w-md bg-white dark:bg-[#1e1f22] rounded-t-2xl sm:rounded-2xl shadow-xl p-8 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-800 dark:text-gray-200">{currentApiKey ? 'Update' : 'Enter'} Your API Key</h1>
            <p className="mt-2 text-sm text-neutral-500 dark:text-gray-400">
                To use Kalina AI, please provide your Google Gemini API key. It will be stored locally in your browser.
            </p>
        </div>
        
        <div className="text-left bg-neutral-100 dark:bg-gray-800/50 p-4 rounded-lg space-y-2 text-sm text-neutral-700 dark:text-gray-300 border border-neutral-200 dark:border-gray-700">
            <h3 className="font-semibold text-neutral-800 dark:text-gray-200">How to get your API Key:</h3>
            <ol className="list-decimal list-inside space-y-1">
                <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 font-semibold underline hover:text-amber-500">Google AI Studio</a>.</li>
                <li>Click the <strong>"Get API key"</strong> button.</li>
                <li>Click <strong>"Create API key"</strong>.</li>
                <li>Copy the generated key and paste it below.</li>
            </ol>
        </div>
        
        <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="Enter your Gemini API key"
                className="w-full bg-neutral-100 dark:bg-gray-800/50 border border-neutral-300 dark:border-gray-600 rounded-lg py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500 text-neutral-800 dark:text-gray-200"
            />
        </div>
        {error && <p className="text-red-500 text-xs text-center">{error}</p>}
        <div className="flex items-center gap-3">
             {currentApiKey && (
                 <button
                    onClick={onClose}
                    className="w-full px-6 py-2.5 bg-neutral-200 dark:bg-gray-700 text-neutral-800 dark:text-gray-200 font-semibold rounded-lg hover:bg-neutral-300 dark:hover:bg-gray-600 transition-colors"
                >
                    Cancel
                </button>
            )}
            <button
                onClick={handleSubmit}
                className="w-full px-6 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 dark:focus:ring-offset-[#1e1f22]"
            >
                {currentApiKey ? 'Update Key' : 'Continue'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;