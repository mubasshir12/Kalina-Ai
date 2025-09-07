import { useState, useEffect } from 'react';

export const useScrollSpy = (
    scrollContainerRef: React.RefObject<HTMLDivElement>,
    userMessageIndices: number[]
): number | null => {
    const [activeMessageIndex, setActiveMessageIndex] = useState<number | null>(null);

    useEffect(() => {
        // Set the initial active index to the last message when the component mounts or messages change.
        if (userMessageIndices.length > 0) {
            setActiveMessageIndex(userMessageIndices[userMessageIndices.length - 1]);
        } else {
            setActiveMessageIndex(null);
        }
    }, [userMessageIndices]);

    useEffect(() => {
        if (!scrollContainerRef.current || userMessageIndices.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter(entry => entry.isIntersecting);
                if (visibleEntries.length > 0) {
                    // Find the entry that is highest up in the viewport
                    const topmostEntry = visibleEntries.reduce((topmost, current) =>
                        current.boundingClientRect.top < topmost.boundingClientRect.top ? current : topmost
                    );
                    const index = parseInt(topmostEntry.target.id.split('-')[1], 10);
                    setActiveMessageIndex(index);
                }
            },
            {
                root: scrollContainerRef.current,
                rootMargin: '0px 0px -50% 0px', // Trigger when an item is in the top half of the viewport
                threshold: 0,
            }
        );

        const elements = userMessageIndices
            .map(index => document.getElementById(`message-${index}`))
            .filter((el): el is HTMLElement => el !== null);

        elements.forEach(el => observer.observe(el));

        return () => observer.disconnect();
    }, [userMessageIndices, scrollContainerRef]);

    return activeMessageIndex;
};
