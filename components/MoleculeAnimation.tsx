import React from 'react';

const MoleculeAnimation: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center my-4 p-4 gap-6">
            <style>{`
            .atom-loader {
                position: relative;
                width: 80px;
                height: 80px;
            }
            .nucleus {
                position: absolute;
                width: 20px;
                height: 20px;
                background: #f59e0b; /* amber-500 */
                border-radius: 50%;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
            }
            .electron {
                position: absolute;
                width: 10px;
                height: 10px;
                background: #60a5fa; /* blue-400 */
                border-radius: 50%;
                top: 50%;
                left: 50%;
                margin: -5px;
                animation-name: orbit;
                animation-iteration-count: infinite;
                animation-timing-function: linear;
            }
            .electron-1 { animation-duration: 2s; }
            .electron-2 { animation-duration: 3s; animation-direction: reverse; }

            @keyframes orbit {
                from { transform: rotate(0deg) translateX(35px) rotate(0deg); }
                to   { transform: rotate(360deg) translateX(35px) rotate(-360deg); }
            }
            `}</style>
            <div className="atom-loader">
                <div className="nucleus"></div>
                <div className="electron electron-1"></div>
                <div className="electron electron-2"></div>
            </div>
            <p className="text-center text-sm text-neutral-500 dark:text-gray-400">
                Searching PubChem for 3D model...
            </p>
        </div>
    );
};

export default MoleculeAnimation;
