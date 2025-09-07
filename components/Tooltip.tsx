import React from 'react';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom';
    align?: 'left' | 'right';
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', align = 'left', className = '' }) => {
    const positionClass = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
    const alignClass = align === 'right' ? 'right-0' : 'left-0';
    return (
        <div className="relative group flex items-center">
            {children}
            <div className={`absolute ${positionClass} ${alignClass} bg-gray-900 dark:bg-black text-white text-xs rounded-md py-1.5 px-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 shadow-lg whitespace-nowrap ${className}`}>
                {content}
            </div>
        </div>
    );
};

export default Tooltip;