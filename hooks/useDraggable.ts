import { useState, useRef, useEffect, useCallback } from 'react';

export const useDraggable = (initialPos = { x: 20, y: window.innerHeight - 80 }) => {
    const [position, setPosition] = useState(initialPos);
    const elementRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const offsetRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isDraggingRef.current = true;
        if (elementRef.current) {
            const rect = elementRef.current.getBoundingClientRect();
            offsetRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        
        let newX = e.clientX - offsetRef.current.x;
        let newY = e.clientY - offsetRef.current.y;

        // Clamp position to be within viewport
        newX = Math.max(0, Math.min(newX, window.innerWidth - (elementRef.current?.offsetWidth || 0)));
        newY = Math.max(0, Math.min(newY, window.innerHeight - (elementRef.current?.offsetHeight || 0)));

        setPosition({ x: newX, y: newY });
    }, []);
    
    const handleMouseUp = useCallback(() => {
        isDraggingRef.current = false;
    }, []);
    
    // Touch events
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        isDraggingRef.current = true;
        if (elementRef.current) {
            const touch = e.touches[0];
            const rect = elementRef.current.getBoundingClientRect();
            offsetRef.current = {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
            };
        }
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isDraggingRef.current) return;
        const touch = e.touches[0];
        
        let newX = touch.clientX - offsetRef.current.x;
        let newY = touch.clientY - offsetRef.current.y;

        newX = Math.max(0, Math.min(newX, window.innerWidth - (elementRef.current?.offsetWidth || 0)));
        newY = Math.max(0, Math.min(newY, window.innerHeight - (elementRef.current?.offsetHeight || 0)));
        
        setPosition({ x: newX, y: newY });
    }, []);
    
    const handleTouchEnd = useCallback(() => {
        isDraggingRef.current = false;
    }, []);

    useEffect(() => {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    return { ref: elementRef, position, handleMouseDown, handleTouchStart };
};
