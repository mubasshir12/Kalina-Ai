import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface ToolSelectionAnimationProps {
  startRect: DOMRect;
  endRect: DOMRect;
  onComplete: () => void;
}

const ToolSelectionAnimation: React.FC<ToolSelectionAnimationProps> = ({ startRect, endRect, onComplete }) => {
  const flare1Ref = useRef<HTMLDivElement>(null);
  const flare2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const flare1 = flare1Ref.current;
    const flare2 = flare2Ref.current;
    if (!flare1 || !flare2) return;

    // Calculate center points for start and end
    const startX = startRect.left + startRect.width / 2;
    const startY = startRect.top + startRect.height / 2;
    const endX = endRect.left + endRect.width / 2;
    const endY = endRect.top + endRect.height / 2;

    // Set initial positions of the flares at the start point
    gsap.set([flare1, flare2], {
      left: startX,
      top: startY,
      xPercent: -50, // Center the element
      yPercent: -50,
    });

    const tl = gsap.timeline({ onComplete });
    
    // Animate flares
    tl.to([flare1, flare2], {
      opacity: 1,
      scale: 1.5,
      duration: 0.2,
      stagger: 0.05,
    })
    .to([flare1, flare2], {
      left: endX,
      top: endY,
      scale: 0.2,
      duration: 0.8,
      ease: 'power2.in',
      stagger: 0.1, // Stagger their arrival slightly
    }, ">")
    .to([flare1, flare2], {
      opacity: 0,
      duration: 0.1,
    });

  }, [startRect, endRect, onComplete]);

  return (
    <>
      <div ref={flare1Ref} className="flare" />
      <div ref={flare2Ref} className="flare" />
    </>
  );
};

export default ToolSelectionAnimation;
