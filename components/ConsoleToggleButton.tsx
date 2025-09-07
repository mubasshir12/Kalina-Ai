import React from 'react';
import { Terminal } from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';

interface Props {
  onClick: () => void;
  errorCount: number;
}

const ConsoleToggleButton: React.FC<Props> = ({ onClick, errorCount }) => {
  const { ref, position, handleMouseDown, handleTouchStart } = useDraggable();
  const hasErrors = errorCount > 0;

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 1000, touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <button
        onClick={onClick}
        className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-colors
          ${hasErrors 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-white dark:bg-gray-800 text-neutral-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-gray-700 border border-neutral-200 dark:border-gray-600'
          }`}
        aria-label="Toggle developer console"
      >
        <Terminal className="w-7 h-7" />
        {hasErrors && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-red-600 text-xs font-bold border-2 border-red-600">
            {errorCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ConsoleToggleButton;