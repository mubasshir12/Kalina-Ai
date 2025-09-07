import React from 'react';
import { FileText } from 'lucide-react';

const FileAnalysisAnimation: React.FC = () => {
    return (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex flex-col items-center justify-center p-2 gap-2 text-white rounded-2xl overflow-hidden">
            <style>
                {`
                .file-analyzer-container {
                    position: relative;
                    width: 64px;
                    height: 64px;
                }
                .file-icon-fa {
                    width: 48px;
                    height: 48px;
                    color: rgba(255, 255, 255, 0.4);
                }
                .scan-line-fa {
                    position: absolute;
                    left: 15%;
                    right: 15%;
                    height: 2px;
                    background-color: #f59e0b; /* amber-500 */
                    box-shadow: 0 0 10px 1px #f59e0b;
                    border-radius: 1px;
                    animation: scan-file 2s ease-in-out infinite;
                }
                .analyzing-text-fa {
                    animation: pulse-text-fa 1.5s ease-in-out infinite alternate;
                }
                @keyframes scan-file {
                    0% { top: 15%; opacity: 0; }
                    25% { opacity: 1; }
                    75% { opacity: 1; }
                    100% { top: 85%; opacity: 0; }
                }
                @keyframes pulse-text-fa {
                    from { opacity: 0.7; }
                    to { opacity: 1; }
                }
                `}
            </style>
            <div className="file-analyzer-container flex items-center justify-center">
                <FileText className="file-icon-fa" />
                <div className="scan-line-fa"></div>
            </div>
            <p className="text-center text-xs font-semibold drop-shadow-md analyzing-text-fa">
                Analyzing file...
            </p>
        </div>
    );
};

export default FileAnalysisAnimation;