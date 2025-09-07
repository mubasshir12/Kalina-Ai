



import React, { useState } from 'react';
import { LayoutGrid, History } from 'lucide-react';
import { ConsoleMode } from '../types';
import ThemeSelector from './ThemeSelector';
import MenuSheet from './MenuSheet';

interface HeaderProps {
    onShowMemory: () => void;
    onShowUsage: () => void;
    isChatView: boolean;
    consoleMode: ConsoleMode;
    setConsoleMode: (mode: ConsoleMode) => void;
    onOpenHistory: () => void;
    conversationCount: number;
}

const Header: React.FC<HeaderProps> = (props) => {
  const [isMenuSheetOpen, setIsMenuSheetOpen] = useState(false);

  return (
    <>
      <header className="bg-white/5 dark:bg-black/5 backdrop-blur-sm border-b border-neutral-200/50 dark:border-white/10 p-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between relative">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-br from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-500 bg-clip-text text-transparent text-3d-effect tracking-tight select-none">
                Kalina AI
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
              {props.isChatView && (
                  <>
                    <ThemeSelector />
                     <button
                        onClick={props.onOpenHistory}
                        className="relative flex items-center justify-center h-10 w-10 text-neutral-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus:outline-none rounded-full"
                        aria-label="Open chat history"
                        title="History"
                    >
                        <History className="h-6 w-6" />
                        {props.conversationCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 text-white pointer-events-none text-[10px] font-medium">
                                {props.conversationCount}
                            </span>
                        )}
                    </button>
                    <button
                      onClick={() => setIsMenuSheetOpen(true)}
                      className="relative flex items-center justify-center h-10 w-10 text-neutral-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 transition-colors focus:outline-none rounded-full"
                      aria-label="Open menu"
                      title="Menu"
                    >
                        <LayoutGrid className="h-6 w-6" />
                    </button>
                  </>
              )}
          </div>
        </div>
      </header>

      <MenuSheet 
        isOpen={isMenuSheetOpen}
        onClose={() => setIsMenuSheetOpen(false)}
        onShowMemory={props.onShowMemory}
        onShowUsage={props.onShowUsage}
        consoleMode={props.consoleMode}
        setConsoleMode={props.setConsoleMode}
      />
    </>
  );
};

export default Header;