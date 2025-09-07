import React from 'react';
import { FileText, Search } from 'lucide-react';

const FileAnalysisAnimation: React.FC = () => {
    return (
        <div className="absolute inset-0 bg-indigo-500/50 backdrop-blur-sm flex flex-col items-center justify-center p-2 gap-2 text-white rounded-2xl overflow-hidden">
            <style>
                {`
                .analyzer-container {
                    position: relative;
                    width: 64px;
                    height: 64px;
                }
                .document-icon-fs {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 40px;
                    height: 40px;
                    color: rgba(255, 255, 255, 0.7);
                }
                .magnifying-glass-fs {
                    position: absolute;
                    width: 32px;
                    height: 32px;
                    color: white;
                    animation: move-magnifier 3s ease-in-out infinite;
                }
                .lens-flare-fs {
                    position: absolute;
                    top: 4px;
                    left: 4px;
                    width: 16px;
                    height: 16px;
                    background: radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%);
                    border-radius: 50%;
                    animation: flare-pulse 1.5s ease-in-out infinite alternate;
                }

                @keyframes move-magnifier {
                    0% { top: 0; left: 0; transform: rotate(-45deg); }
                    25% { top: 0; left: 32px; transform: rotate(-15deg); }
                    50% { top: 32px; left: 32px; transform: rotate(45deg); }
                    75% { top: 32px; left: 0; transform: rotate(15deg); }
                    100% { top: 0; left: 0; transform: rotate(-45deg); }
                }

                @keyframes flare-pulse {
                    from { transform: scale(0.8); opacity: 0.7; }
                    to { transform: scale(1.2); opacity: 1; }
                }
                `}
            </style>
            <div className="analyzer-container">
                <FileText className="document-icon-fs" />
                <div className="magnifying-glass-fs">
                    <Search className="w-full h-full" />
                    <div className="lens-flare-fs" />
                </div>
            </div>
            <p className="text-center text-xs font-semibold drop-shadow-md">
                Analyzing file...
            </p>
        </div>
    );
};

export default FileAnalysisAnimation;
