import { useState, useEffect } from 'react';

export const useMessagePositions = (
    scrollContainerRef: React.RefObject<HTMLDivElement>,
    messageIndices: number[]
): Map<number, number> => {
    const [positions, setPositions] = useState<Map<number, number>>(new Map());

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || messageIndices.length === 0) {
            setPositions(new Map());
            return;
        }

        const calculatePositions = () => {
            const newPositions = new Map<number, number>();
            const scrollHeight = container.scrollHeight;

            if (scrollHeight <= 0) return;

            messageIndices.forEach(msgIndex => {
                const element = document.getElementById(`message-${msgIndex}`);
                if (element) {
                    const percent = (element.offsetTop / scrollHeight) * 100;
                    newPositions.set(msgIndex, percent);
                }
            });

            setPositions(newPositions);
        };
        
        // Use a timeout to ensure the DOM has settled after a change
        const debouncedCalculate = () => setTimeout(calculatePositions, 50);

        // Initial calculation
        debouncedCalculate();

        // Observe for changes in the container that would affect layout
        const observer = new MutationObserver(debouncedCalculate);
        observer.observe(container, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true
        });

        const resizeObserver = new ResizeObserver(debouncedCalculate);
        resizeObserver.observe(container);

        return () => {
            observer.disconnect();
            resizeObserver.disconnect();
        };

    }, [scrollContainerRef, messageIndices]);

    return positions;
};