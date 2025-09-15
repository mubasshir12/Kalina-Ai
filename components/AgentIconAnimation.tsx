

import React from 'react';
import { AgentName } from '../types';
import { agentMetadata } from '../services/agentService';

interface AgentIconAnimationProps {
    agentName: AgentName;
    isActive: boolean;
}

const AgentIconAnimation: React.FC<AgentIconAnimationProps> = ({ agentName, isActive }) => {
    if (!isActive) return null;

    const { color } = agentMetadata[agentName];
    // Use stroke for line-based icons and fill for solid shapes
    const iconStrokeColorClass = color.replace('text-', 'stroke-');
    const iconFillColorClass = color.replace('text-', 'fill-');

    const animations: Record<AgentName, React.ReactNode> = {
        researcher: (
            <svg viewBox="0 0 100 100" className="agent-anim-svg">
                <circle cx="50" cy="50" r="45" className={`${iconStrokeColorClass} loading-border`} />
                <g className="globe-lines">
                    <circle cx="50" cy="50" r="35" strokeWidth="4" className={iconStrokeColorClass} />
                    <ellipse cx="50" cy="50" rx="15" ry="35" strokeWidth="4" className={iconStrokeColorClass} />
                    <ellipse cx="50" cy="50" rx="30" ry="35" strokeWidth="4" className={iconStrokeColorClass} transform="rotate(90 50 50)" />
                </g>
                <circle cx="50" cy="30" r="2" fill="white" className="data-point" />
                <circle cx="35" cy="60" r="2" fill="white" className="data-point" />
                <circle cx="70" cy="55" r="2" fill="white" className="data-point" />
                <circle cx="45" cy="75" r="2" fill="white" className="data-point" />
            </svg>
        ),
        'fact-checker': (
            <svg viewBox="0 0 100 100" className="agent-anim-svg">
                <circle cx="50" cy="50" r="45" className={`${iconStrokeColorClass} loading-border`} />
                <rect x="25" y="20" width="50" height="60" rx="5" strokeWidth="4" className={iconStrokeColorClass} />
                <line x1="35" y1="35" x2="65" y2="35" strokeWidth="4" className={iconStrokeColorClass} />
                <line x1="35" y1="48" x2="65" y2="48" strokeWidth="4" className={iconStrokeColorClass} />
                <line x1="35" y1="61" x2="55" y2="61" strokeWidth="4" className={iconStrokeColorClass} />
                <line x1="25" y1="28" x2="75" y2="28" stroke="white" strokeWidth="6" className="scan-line" />
                <path d="M35 55 L48 68 L70 40" strokeWidth="8" stroke="white" className="check-mark" />
            </svg>
        ),
        advocate: (
            <svg viewBox="0 0 100 100" className="agent-anim-svg">
                <circle cx="50" cy="50" r="45" className={`${iconStrokeColorClass} loading-border`} />
                {/* Megaphone Body */}
                <path d="M 25 35 L 45 25 L 45 75 L 25 65 Z" strokeWidth="4" className={iconStrokeColorClass} fill="none" />
                <rect x="15" y="45" width="10" height="10" strokeWidth="4" className={iconStrokeColorClass} fill="none" />
                {/* Sound Waves */}
                <path d="M 55 35 Q 70 50 55 65" strokeWidth="4" className={`${iconStrokeColorClass} wave wave1`} />
                <path d="M 65 25 Q 85 50 65 75" strokeWidth="4" className={`${iconStrokeColorClass} wave wave2`} />
                <path d="M 75 15 Q 100 50 75 85" strokeWidth="4" className={`${iconStrokeColorClass} wave wave3`} />
            </svg>
        ),
        critic: (
            <svg viewBox="0 0 100 100" className="agent-anim-svg">
                <circle cx="50" cy="50" r="45" className={`${iconStrokeColorClass} loading-border`} />
                <circle cx="50" cy="50" r="35" strokeWidth="8" className={`${iconStrokeColorClass} outer-ring`} />
                <circle cx="50" cy="50" r="15" strokeWidth="6" className={`${iconStrokeColorClass} inner-ring`} />
                <line x1="50" y1="20" x2="50" y2="80" strokeWidth="6" className={iconStrokeColorClass} />
                <line x1="20" y1="50" x2="80" y2="50" strokeWidth="6" className={iconStrokeColorClass} />
            </svg>
        ),
        executer: (
            <svg viewBox="0 0 100 100" className="agent-anim-svg" strokeLinecap="butt">
                <circle cx="50" cy="50" r="45" className={`${iconStrokeColorClass} loading-border`} />
                <path className={`gear gear1 ${iconStrokeColorClass}`} d="M 50,50 m -25,0 a 25,25 0 1,0 50,0 a 25,25 0 1,0 -50,0 M 50,50 m -15,0 a 15,15 0 1,0 30,0 a 15,15 0 1,0 -30,0" strokeWidth="6"/>
                <path className={`gear gear2 ${iconStrokeColorClass}`} d="M 50,50 m -20,0 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0" strokeWidth="5"/>
            </svg>
        ),
        finalizer: (
            <svg viewBox="0 0 100 100" className="agent-anim-svg">
                <circle cx="50" cy="50" r="45" className={`${iconStrokeColorClass} loading-border`} />
                <path d="M50 15 L62 40 L88 40 L68 58 L78 85 L50 68 L22 85 L32 58 L12 40 L38 40 Z" 
                    strokeWidth="5" className={`${iconStrokeColorClass} star-path`} />
                {/* Sparkles */}
                <g className="sparkle-group">
                    <line x1="15" y1="15" x2="25" y2="25" stroke="white" strokeWidth="4" />
                    <line x1="85" y1="15" x2="75" y2="25" stroke="white" strokeWidth="4" />
                    <line x1="15" y1="85" x2="25" y2="75" stroke="white" strokeWidth="4" />
                    <line x1="85" y1="85" x2="75" y2="75" stroke="white" strokeWidth="4" />
                </g>
            </svg>
        ),
    };
    
    return (
        <>
            <style>{`
                .agent-anim-svg {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                }
                .agent-anim-svg path, .agent-anim-svg circle, .agent-anim-svg rect, .agent-anim-svg line, .agent-anim-svg ellipse {
                    fill: none;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }

                /* Common Loading Border */
                .loading-border {
                    stroke-dasharray: 283; /* Circumference of a 90-diameter circle */
                    stroke-dashoffset: 283;
                    stroke-width: 6;
                    stroke-linecap: round;
                    transform-origin: center;
                    transform: rotate(-90deg);
                    animation: loading-border-anim 2s ease-in-out infinite;
                }
                @keyframes loading-border-anim {
                    0% { stroke-dashoffset: 283; }
                    50% { stroke-dashoffset: 70; }
                    100% { stroke-dashoffset: 283; transform: rotate(270deg); }
                }

                /* Researcher: Globe with Data Points */
                .researcher-anim .globe-lines {
                    animation: researcher-spin 10s linear infinite;
                    transform-origin: center;
                }
                .researcher-anim .data-point {
                    animation: researcher-blink 2s ease-in-out infinite;
                }
                .researcher-anim .data-point:nth-child(2) { animation-delay: 0.4s; }
                .researcher-anim .data-point:nth-child(3) { animation-delay: 0.8s; }
                .researcher-anim .data-point:nth-child(4) { animation-delay: 1.2s; }
                @keyframes researcher-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes researcher-blink { 0%, 100% { opacity: 0; r: 1; } 50% { opacity: 1; r: 3; } }

                /* Fact-Checker: Document Scan */
                .fact-checker-anim .scan-line {
                    animation: fact-checker-scan 2.5s ease-in-out infinite;
                    opacity: 0;
                }
                .fact-checker-anim .check-mark {
                    stroke-dasharray: 50;
                    stroke-dashoffset: 50;
                    transform-origin: center;
                    animation: fact-checker-stamp 2.5s 1.2s ease-in-out infinite;
                }
                @keyframes fact-checker-scan {
                    0% { transform: translateY(0px); opacity: 0; }
                    20% { opacity: 1; }
                    80% { transform: translateY(40px); opacity: 1; }
                    100% { opacity: 0; }
                }
                @keyframes fact-checker-stamp {
                    0% { stroke-dashoffset: 50; transform: scale(0.5); }
                    20% { stroke-dashoffset: 0; transform: scale(1.2); }
                    40% { transform: scale(1); }
                    100% { transform: scale(1); }
                }

                /* Advocate: Megaphone */
                .advocate-anim .wave {
                    opacity: 0;
                    animation: advocate-radiate 2.5s ease-out infinite;
                }
                .advocate-anim .wave2 { animation-delay: 0.3s; }
                .advocate-anim .wave3 { animation-delay: 0.6s; }
                @keyframes advocate-radiate {
                    0% { opacity: 0; transform: translateX(0); }
                    50% { opacity: 1; }
                    100% { opacity: 0; transform: translateX(10px); }
                }

                /* Critic */
                .critic-anim .outer-ring { animation: critic-pulse 2s ease-in-out infinite; }
                .critic-anim .inner-ring { animation: critic-pulse-rev 2s ease-in-out infinite; }
                @keyframes critic-pulse { 0%, 100% { stroke-width: 8; opacity: 1; } 50% { stroke-width: 4; opacity: 0.5; } }
                @keyframes critic-pulse-rev { 0%, 100% { stroke-width: 6; opacity: 0.5; } 50% { stroke-width: 10; opacity: 1; } }

                /* Executer */
                .executer-anim .gear { transform-origin: center; }
                .executer-anim .gear1 {
                    stroke-dasharray: 10 20;
                    animation: executer-spin 4s linear infinite, executer-dash 2s ease-in-out infinite alternate;
                }
                .executer-anim .gear2 {
                    stroke-dasharray: 5 10;
                    animation: executer-spin-rev 4s linear infinite, executer-dash 2s 1s ease-in-out infinite alternate;
                }
                @keyframes executer-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes executer-spin-rev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                @keyframes executer-dash { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 60; } }

                /* Finalizer: Drawing Star */
                .finalizer-anim .star-path {
                    stroke-dasharray: 250;
                    stroke-dashoffset: 250;
                    animation: finalizer-draw-star 3s ease-in-out infinite;
                    transform-origin: center;
                }
                .finalizer-anim .sparkle-group {
                    opacity: 0;
                    animation: finalizer-sparkle-shine 3s 1s ease-in-out infinite;
                    transform-origin: center;
                }
                @keyframes finalizer-draw-star {
                    0% { stroke-dashoffset: 250; transform: scale(0.5) rotate(-90deg); }
                    50% { stroke-dashoffset: 0; transform: scale(1.1) rotate(0deg); }
                    80% { stroke-dashoffset: 0; transform: scale(1); }
                    100% { stroke-dashoffset: 0; transform: scale(1); }
                }
                @keyframes finalizer-sparkle-shine {
                    0%, 100% { opacity: 0; transform: scale(0.8) rotate(0deg); }
                    50% { opacity: 1; transform: scale(1.1) rotate(20deg); }
                }
            `}</style>
            <div className={`w-10 h-10 agent-anim-container ${agentName}-anim`}>
                {animations[agentName]}
            </div>
        </>
    );
};

export default AgentIconAnimation;