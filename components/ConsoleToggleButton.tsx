import React from 'react';
import { Terminal } from 'lucide-react';
import { useDraggable } from '../hooks/useDraggable';

interface Props {
  onClick: () => void;
  errorCount: number;
  warningCount: number;
}

const ConsoleToggleButton: React.FC<Props> = ({ onClick, errorCount, warningCount }) => {
  const { ref, position, handleMouseDown, handleTouchStart } = useDraggable();
  const hasErrors = errorCount > 0;
  const hasWarningsOnly = !hasErrors && warningCount > 0;

  const badgeCount = hasErrors ? errorCount : warningCount;
  const showBadge = hasErrors || hasWarningsOnly;

  const buttonClasses = `flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-colors ${
    hasErrors
      ? 'bg-red-600 text-white hover:bg-red-700'
      : hasWarningsOnly
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-white dark:bg-gray-800 text-neutral-700 dark:text-gray-200 hover:bg-neutral-100 dark:hover:bg-gray-700 border border-neutral-200 dark:border-gray-600'
  }`;
  
  const badgeClasses = `absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border-2 ${
    hasErrors
      ? 'bg-white text-red-600 border-red-600'
      : 'bg-white text-blue-600 border-blue-600'
  }`;

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 1000, touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <button
        onClick={onClick}
        className={buttonClasses}
        aria-label="Toggle developer console"
      >
        <Terminal className="w-7 h-7" />
        {showBadge && (
          <span className={badgeClasses}>
            {badgeCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default ConsoleToggleButton;