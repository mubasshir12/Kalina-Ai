import React from 'react';

interface OrbitalAnimationProps {
    orbitalName?: string;
}

const OrbitalAnimation: React.FC<OrbitalAnimationProps> = ({ orbitalName }) => {
    const displayText = orbitalName
        ? `Visualizing ${orbitalName}...`
        : 'Visualizing atomic orbital...';

    return (
        <div className="flex flex-col items-center justify-center my-4 p-4 gap-6">
            <style>{`
            .orbital-loader {
                position: relative;
                width: 80px;
                height: 80px;
                transform-style: preserve-3d;
                animation: rotate-orbital-loader 8s linear infinite;
            }
            .orbital-nucleus {
                position: absolute;
                width: 15px;
                height: 15px;
                background: #fcd34d; /* amber-300 */
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            .orbital-path {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: 2px solid;
                border-radius: 50%;
                transform-style: preserve-3d;
            }
            .path-1 { border-color: #93c5fd; transform: rotateX(70deg); } /* blue-300 */
            .path-2 { border-color: #a78bfa; transform: rotateY(70deg); } /* violet-300 */
            .path-3 { border-color: #fca5a5; transform: rotateX(70deg) rotateY(60deg); } /* red-300 */
            
            .orbital-electron {
                 position: absolute;
                width: 8px;
                height: 8px;
                background: white;
                border-radius: 50%;
                top: 50%;
                left: 50%;
                margin: -4px;
            }
            .path-1 .orbital-electron { animation: orbit-1 2s linear infinite; }
            .path-2 .orbital-electron { animation: orbit-2 3s linear infinite; }
            .path-3 .orbital-electron { animation: orbit-3 2.5s linear infinite; }

            @keyframes rotate-orbital-loader {
                from { transform: rotateY(0deg) rotateX(20deg); }
                to   { transform: rotateY(360deg) rotateX(20deg); }
            }
            @keyframes orbit-1 {
                from { transform: rotateZ(0deg) translateX(40px) rotateZ(0deg); }
                to   { transform: rotateZ(360deg) translateX(40px) rotateZ(-360deg); }
            }
            @keyframes orbit-2 {
                from { transform: rotateZ(0deg) translateX(40px) rotateZ(0deg); }
                to   { transform: rotateZ(-360deg) translateX(40px) rotateZ(360deg); }
            }
            @keyframes orbit-3 {
                from { transform: rotateZ(0deg) translateX(40px) rotateZ(0deg); }
                to   { transform: rotateZ(360deg) translateX(40px) rotateZ(-360deg); }
            }

            `}</style>
            <div className="orbital-loader">
                <div className="orbital-nucleus"></div>
                <div className="orbital-path path-1"><div className="orbital-electron"></div></div>
                <div className="orbital-path path-2"><div className="orbital-electron"></div></div>
                <div className="orbital-path path-3"><div className="orbital-electron"></div></div>
            </div>
            <p className="text-center text-sm text-neutral-500 dark:text-gray-400">
                {displayText}
            </p>
        </div>
    );
};

export default OrbitalAnimation;
