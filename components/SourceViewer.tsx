import React, { useRef, useState, useEffect, useMemo } from 'react';
import { GroundingChunk, AgentName } from '../types';
import { useDraggableSheet } from '../hooks/useDraggableSheet';
import { X, ExternalLink } from 'lucide-react';
import { agentMetadata } from '../services/agentService';
import Tooltip from './Tooltip';

interface SourceViewerProps {
    sources: GroundingChunk[];
    onClose: () => void;
}

interface ProcessedSource {
    uri: string;
    title: string;
    agents: Set<AgentName>;
}

const SourceViewer: React.FC<SourceViewerProps> = ({ sources, onClose }) => {
    const sheetRef = useRef<HTMLDivElement>(null);
    const [isMounted, setIsMounted] = useState(false);
    const { sheetStyle, handleRef } = useDraggableSheet(sheetRef, onClose, isMounted);

    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const processedSources = useMemo((): ProcessedSource[] => {
        const sourceMap = new Map<string, { uri: string, title: string; agents: Set<AgentName> }>();

        sources.forEach(source => {
            const { uri, title } = source.web;
            if (!uri) return;

            // Key by both URI and title to ensure uniqueness
            const uniqueKey = `${uri}|${title}`;

            if (!sourceMap.has(uniqueKey)) {
                sourceMap.set(uniqueKey, { uri, title, agents: new Set() });
            }
            if (source.agent) {
                sourceMap.get(uniqueKey)!.agents.add(source.agent);
            }
        });

        return Array.from(sourceMap.values());
    }, [sources]);

    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    const content = (
        <div className="flex flex-col h-full">
            <header ref={handleRef} className="p-4 border-b border-neutral-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0 sm:cursor-default cursor-grab active:cursor-grabbing">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200">
                    Sources ({processedSources.length})
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close sources view"
                >
                    <X className="h-5 w-5 text-neutral-500 dark:text-gray-400" />
                </button>
            </header>
            <div className="overflow-y-auto p-4 flex-1">
                <ul className="space-y-3">
                    {processedSources.map((source, index) => {
                         const hostname = source.uri ? new URL(source.uri).hostname.replace(/^www\./, '') : 'Unknown source';
                         return (
                            <li key={index}>
                                <a
                                    href={source.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-gray-800/60 transition-colors border border-neutral-200 dark:border-gray-700/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-neutral-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-neutral-500 dark:text-gray-400">
                                            {index + 1}
                                        </div>
                                        
                                        <p className="flex-1 text-sm font-medium text-orange-600 dark:text-orange-500 truncate" title={source.title || hostname}>
                                            {source.title || hostname}
                                        </p>
                                        
                                        {source.agents.size > 0 && (
                                            <div className="flex items-center gap-x-3 flex-shrink-0 ml-3">
                                                {Array.from(source.agents).map(agentName => {
                                                    const meta = agentMetadata[agentName];
                                                    if (!meta) return null;
                                                    const Icon = meta.icon;
                                                    return (
                                                        <Tooltip content={`Cited by: ${meta.name}`} key={agentName}>
                                                            <div className="flex items-center gap-1.5">
                                                                <Icon className={`w-4 h-4 ${meta.color}`} />
                                                                <span className="text-xs text-neutral-600 dark:text-gray-300">{meta.name}</span>
                                                            </div>
                                                        </Tooltip>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        
                                        <ExternalLink className="h-4 w-4 text-neutral-400 dark:text-gray-500 flex-shrink-0" />
                                    </div>
                                </a>
                            </li>
                         )
                    })}
                </ul>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <>
                <div
                    className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={onClose}
                    aria-hidden="true"
                ></div>
                <div
                    ref={sheetRef}
                    className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1e1f22] rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
                        isMounted ? '' : 'translate-y-full'
                    } h-[60dvh] flex flex-col`}
                    style={isMounted ? sheetStyle : {}}
                    role="dialog"
                    aria-modal="true"
                >
                    {content}
                </div>
            </>
        );
    }

    return (
        <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isMounted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1e1f22] rounded-2xl shadow-xl w-full max-w-lg h-[70vh] flex flex-col transform transition-all"
                role="dialog"
                onClick={(e) => e.stopPropagation()}
            >
                {content}
            </div>
        </div>
    );
};

export default SourceViewer;
