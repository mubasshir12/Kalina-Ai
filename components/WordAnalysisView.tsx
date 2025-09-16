
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ArrowLeft, RefreshCw, Search, Download } from 'lucide-react';
import { getAllWords } from '../services/dbService';
import Tooltip from './Tooltip';

interface WordAnalysis {
    total: number;
    unique: number;
    wordFrequency: Map<string, number>;
    alphabeticalBreakdown: Record<string, number>;
    averageLength: number;
    lengthDistribution: Map<number, number>;
    characterFrequency: Map<string, number>;
}

const formatCount = (num: number): string => {
    if (num < 1000) return num.toString();
    const suffixes = ["", "K", "M", "B", "T"];
    const i = Math.floor(Math.log(num) / Math.log(1000));
    if (i >= suffixes.length) return num.toExponential(1);
    return `${parseFloat((num / Math.pow(1000, i)).toFixed(1))}${suffixes[i]}`;
};

const StatCard: React.FC<{ label: string, value: string, fullValue: number | string, colorClass: string }> = ({ label, value, fullValue, colorClass }) => (
    <Tooltip content={`${label}: ${typeof fullValue === 'number' ? fullValue.toLocaleString() : fullValue}`}>
        <div className="bg-white/80 dark:bg-[#2E2F33]/80 backdrop-blur-sm p-4 rounded-xl border border-neutral-200 dark:border-gray-700/50 cursor-help transition-all duration-200 hover:border-amber-400 dark:hover:border-amber-500 hover:scale-[1.02]">
            <p className="text-sm text-neutral-500 dark:text-gray-400">{label}</p>
            <p className={`text-3xl font-bold ${colorClass} truncate`}>{value}</p>
        </div>
    </Tooltip>
);

const ROW_HEIGHT = 32; // px, corresponds to h-8
const CONTAINER_HEIGHT = 320; // px, corresponds to h-80

interface PairedWord {
    left: string;
    right: string | null;
}

const VirtualizedTable: React.FC<{ items: PairedWord[] }> = ({ items }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    const startIndex = Math.floor(scrollTop / ROW_HEIGHT);
    const visibleCount = Math.ceil(CONTAINER_HEIGHT / ROW_HEIGHT) + 2; // +2 for buffer
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    const visibleItems = items.slice(startIndex, endIndex);

    return (
        <div className="bg-neutral-100 dark:bg-gray-800/60 rounded-md">
            <table className="w-full text-sm text-left table-fixed">
                <thead className="text-xs text-neutral-500 dark:text-gray-400 uppercase">
                    <tr>
                        <th className="px-4 py-2 w-1/2 text-center border-r border-neutral-200 dark:border-gray-700/50">Word</th>
                        <th className="px-4 py-2 w-1/2 text-center">Word</th>
                    </tr>
                </thead>
            </table>
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="overflow-y-auto"
                style={{ height: `${CONTAINER_HEIGHT}px` }}
            >
                <div
                    className="relative w-full"
                    style={{ height: `${items.length * ROW_HEIGHT}px` }}
                >
                    <table className="w-full text-sm text-left absolute top-0 left-0 table-fixed">
                        <tbody className="font-mono">
                            {visibleItems.map((item, index) => {
                                const actualIndex = startIndex + index;
                                return (
                                    <tr
                                        key={actualIndex}
                                        className="border-b border-neutral-200 dark:border-gray-700/50 h-8"
                                        style={{
                                            position: 'absolute',
                                            width: '100%',
                                            transform: `translateY(${actualIndex * ROW_HEIGHT}px)`,
                                        }}
                                    >
                                        <td className="px-4 py-1.5 w-1/2 text-center border-r border-neutral-200 dark:border-gray-700/50">{item.left}</td>
                                        <td className="px-4 py-1.5 w-1/2 text-center">{item.right || ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const BarChart: React.FC<{ data: Map<string | number, number>; title: string; barColorClass: string; }> = ({ data, title, barColorClass }) => {
    const sortedData = useMemo(() => Array.from(data.entries()).sort((a, b) => {
        if (typeof a[0] === 'number' && typeof b[0] === 'number') return a[0] - b[0];
        return String(a[0]).localeCompare(String(b[0]));
    }), [data]);
    
    const maxValue = useMemo(() => Math.max(...Array.from(data.values())), [data]);

    return (
        <div className="bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200 mb-3">{title}</h2>
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-13 gap-x-2 gap-y-2 text-center text-xs font-mono">
                {sortedData.map(([key, value]) => (
                    <div key={key} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-neutral-600 dark:text-gray-400 font-bold h-3">{formatCount(value)}</span>
                         <Tooltip content={`${key}: ${value.toLocaleString()}`}>
                            <div className="w-full h-24 bg-neutral-100 dark:bg-gray-800/60 rounded flex items-end">
                                <div
                                    className={`w-full ${barColorClass} rounded transition-all duration-500`}
                                    style={{ height: `${(value / maxValue) * 100}%` }}
                                ></div>
                            </div>
                        </Tooltip>
                        <span className="font-semibold text-neutral-500 dark:text-gray-400 mt-1">{key}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


const WordAnalysisView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [allWords, setAllWords] = useState<string[]>([]);
    const [analysis, setAnalysis] = useState<WordAnalysis | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [status, setStatus] = useState('');

    const performAnalysis = useCallback((words: string[]) => {
        if (words.length === 0) {
            setAnalysis(null);
            return;
        }

        const wordFrequency = new Map<string, number>();
        const alphabeticalBreakdown: Record<string, number> = {};
        const lengthDistribution = new Map<number, number>();
        const characterFrequency = new Map<string, number>();
        
        let totalLength = 0;

        words.forEach(word => {
            const lowerWord = word.toLowerCase();
            const len = word.length;
            totalLength += len;

            wordFrequency.set(lowerWord, (wordFrequency.get(lowerWord) || 0) + 1);
            lengthDistribution.set(len, (lengthDistribution.get(len) || 0) + 1);
            
            const firstLetter = lowerWord.charAt(0).toUpperCase();
            if (/[A-Z]/.test(firstLetter)) {
                alphabeticalBreakdown[firstLetter] = (alphabeticalBreakdown[firstLetter] || 0) + 1;
            }

            for (const char of lowerWord) {
                if (/[a-z]/.test(char)) {
                    characterFrequency.set(char.toUpperCase(), (characterFrequency.get(char.toUpperCase()) || 0) + 1);
                }
            }
        });

        setAnalysis({
            total: words.length,
            unique: wordFrequency.size,
            wordFrequency,
            alphabeticalBreakdown,
            averageLength: parseFloat((totalLength / words.length).toFixed(2)),
            lengthDistribution,
            characterFrequency
        });
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setStatus('Fetching words from database...');
        try {
            const words = await getAllWords();
            setAllWords(words);
            performAnalysis(words);
            setStatus(words.length > 0 ? `Analysis complete. Found ${words.length} total words.` : 'No words found in the database.');
        } catch (e) {
            console.error(e);
            setStatus('Error fetching words.');
        } finally {
            setIsLoading(false);
        }
    }, [performAnalysis]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDownload = () => {
        if (allWords.length === 0) {
            alert('No words to download.');
            return;
        }
        const defaultName = `kalina_words_backup_${new Date().toISOString().split('T')[0]}.txt`;
        const fileName = prompt('Enter a filename for the download:', defaultName);

        if (!fileName) return;

        const content = allWords.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const sortedFrequency = useMemo(() => {
        if (!analysis) return [];
        let filtered = Array.from(analysis.wordFrequency.entries());
        if (searchTerm) {
            filtered = filtered.filter(([word]) => word.includes(searchTerm.toLowerCase()));
        }
        return filtered.sort((a, b) => b[1] - a[1]);
    }, [analysis, searchTerm]);

    const pairedWords = useMemo(() => {
        const words = sortedFrequency.map(([word]) => word);
        const pairs: PairedWord[] = [];
        for (let i = 0; i < words.length; i += 2) {
            pairs.push({
                left: words[i],
                right: words[i + 1] || null,
            });
        }
        return pairs;
    }, [sortedFrequency]);

    return (
        <main className="relative z-10 flex-1 flex flex-col overflow-y-auto p-4 md:p-6">
            <div className="max-w-6xl mx-auto w-full">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-800 transition-colors mr-2 md:mr-4" aria-label="Back">
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                        <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-gray-200">Word Database Analysis</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip content="Download all words as .txt">
                            <button
                                onClick={handleDownload}
                                disabled={isLoading || allWords.length === 0}
                                className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Download all words"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                        </Tooltip>
                        <Tooltip content="Refresh Data">
                            <button onClick={fetchData} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-800 transition-colors" aria-label="Refresh Data">
                                <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {isLoading ? (
                    <div className="text-center text-neutral-500 dark:text-gray-400 py-20">
                        <p>{status}</p>
                    </div>
                ) : !analysis ? (
                    <div className="text-center text-neutral-500 dark:text-gray-400 py-20">
                        <p>No data to analyze. You can add words in the Developer Console.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <StatCard label="Total Words" value={formatCount(analysis.total)} fullValue={analysis.total} colorClass="text-blue-500 dark:text-blue-400" />
                            <StatCard label="Unique Words" value={formatCount(analysis.unique)} fullValue={analysis.unique} colorClass="text-green-500 dark:text-green-400" />
                        </div>
                        
                        <div className="space-y-6 mb-6">
                            <BarChart data={analysis.lengthDistribution} title="Word Length Distribution" barColorClass="bg-yellow-500" />
                            <BarChart data={new Map(Object.entries(analysis.alphabeticalBreakdown))} title="Alphabetical Distribution" barColorClass="bg-purple-500" />
                            <BarChart data={analysis.characterFrequency} title="Character Frequency" barColorClass="bg-pink-500" />
                        </div>

                        <div className="bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral-200 dark:border-gray-700 p-4">
                            <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200 mb-2">Word Frequency</h2>
                            <div className="relative mb-4">
                                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                                 <input 
                                    type="text"
                                    placeholder={`Search through ${analysis.unique.toLocaleString()} unique words...`}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-neutral-100 dark:bg-gray-800/60 border border-neutral-300 dark:border-gray-600 rounded-lg py-2 pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                 />
                            </div>
                            <VirtualizedTable items={pairedWords} />
                        </div>
                    </>
                )}
            </div>
        </main>
    );
};

export default WordAnalysisView;