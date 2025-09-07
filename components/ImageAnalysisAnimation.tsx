import React from 'react';
import { Eye } from 'lucide-react';

const ImageAnalysisAnimation: React.FC = () => {
    return (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-2 gap-2 text-white">
            <style>
                {`
                .scan-line {
                    position: absolute;
                    left: 10%;
                    right: 10%;
                    height: 2px;
                    background-color: #818cf8; /* indigo-400 */
                    box-shadow: 0 0 8px #818cf8;
                    border-radius: 1px;
                    animation: scan-vertical 2.5s ease-in-out infinite;
                }
                .eye-icon-analyzer {
                    animation: pulse-eye 2.5s ease-in-out infinite;
                }
                @keyframes scan-vertical {
                    0% { top: 15%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 85%; opacity: 0; }
                }
                @keyframes pulse-eye {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.1); opacity: 1; }
                }
                `}
            </style>
            <Eye className="h-12 w-12 eye-icon-analyzer" />
            <div className="scan-line"></div>
            <p className="text-center text-xs font-semibold drop-shadow-md">
                Analyzing image...
            </p>
        </div>
    );
};

export default ImageAnalysisAnimation;