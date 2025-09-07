
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactElement; // Must be a single ReactElement
    position?: 'top' | 'bottom';
    align?: 'left' | 'right' | 'center';
    className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', align = 'center', className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const targetRef = useRef<HTMLElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const updatePosition = useCallback(() => {
        if (!targetRef.current || !tooltipRef.current) return;

        const targetRect = targetRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const { width: tooltipWidth, height: tooltipHeight } = tooltipRect;
        
        const margin = 8;

        const hasSpaceTop = targetRect.top >= tooltipHeight + margin;
        const hasSpaceBottom = window.innerHeight - targetRect.bottom >= tooltipHeight + margin;

        let finalTop;
        if (position === 'top') {
            finalTop = hasSpaceTop ? targetRect.top - tooltipHeight - margin : targetRect.bottom + margin;
        } else { // position === 'bottom'
            finalTop = hasSpaceBottom ? targetRect.bottom + margin : targetRect.top - tooltipHeight - margin;
        }

        let finalLeft;
        if (align === 'center') {
            finalLeft = targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2);
        } else if (align === 'left') {
            finalLeft = targetRect.left;
        } else { // right
            finalLeft = targetRect.right - tooltipWidth;
        }

        // Horizontal collision detection
        if (finalLeft < margin) finalLeft = margin;
        if (finalLeft + tooltipWidth > window.innerWidth - margin) {
            finalLeft = window.innerWidth - tooltipWidth - margin;
        }
        
        // Final vertical collision check to prevent going off-screen if flipping wasn't enough
        if (finalTop < margin) finalTop = margin;
        if (finalTop + tooltipHeight > window.innerHeight - margin) {
            finalTop = window.innerHeight - tooltipHeight - margin;
        }

        setCoords({ top: finalTop, left: finalLeft });
    }, [position, align]);

    useEffect(() => {
        if (isVisible) {
            // Use a microtask timeout to allow the tooltip to render invisibly first,
            // so we can measure its dimensions before positioning it.
            queueMicrotask(updatePosition);
        }
    }, [isVisible, updatePosition]);
    
    const handleMouseEnter = (e: React.MouseEvent) => {
        // FIX: Cast children.props to `any` to safely access and call the original event handler.
        // The `children` prop's type is too generic for TypeScript to know its props.
        if (typeof (children.props as any).onMouseEnter === 'function') {
            (children.props as any).onMouseEnter(e);
        }
        setIsVisible(true);
    };

    const handleMouseLeave = (e: React.MouseEvent) => {
        // FIX: Cast children.props to `any` to safely access and call the original event handler.
        if (typeof (children.props as any).onMouseLeave === 'function') {
            (children.props as any).onMouseLeave(e);
        }
        setIsVisible(false);
    };
    
    // The original logic for merging refs was flawed because `children.ref` is not a readable property.
    // This simplified callback only handles setting the tooltip's internal target ref.
    // This is safe for this app as no child of Tooltip is passed a ref.
    const handleRef = useCallback((node: HTMLElement | null) => {
        (targetRef as React.MutableRefObject<HTMLElement | null>).current = node;
    }, []);

    // FIX: The type of `children` is `React.ReactElement`, which is too generic for TypeScript 
    // to know if it can accept a `ref` or event handlers. Casting `children` to 
    // `React.ReactElement<any>` tells TypeScript to allow these props, fixing the compile error.
    const childWithProps = React.cloneElement(children as React.ReactElement<any>, {
        ref: handleRef,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
    });
    
    const TooltipPortal = createPortal(
        <div
            ref={tooltipRef}
            className={`fixed bg-gray-900 dark:bg-black text-white text-xs rounded-md py-1.5 px-3 pointer-events-none z-50 shadow-lg transition-opacity duration-200 ${className} ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            style={isVisible ? { top: `${coords.top}px`, left: `${coords.left}px` } : { visibility: 'hidden' }}
            role="tooltip"
        >
            {content}
        </div>,
        document.body
    );

    return (
        <>
            {childWithProps}
            {TooltipPortal}
        </>
    );
};

export default Tooltip;
