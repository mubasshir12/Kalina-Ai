import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UploadCloud, Trash2, FileText, Save, GitMerge, Sparkles, LoaderCircle, BarChart, Wand2 } from 'lucide-react';
import { clearWords, addWords, getStorageBreakdown, getAllWords } from '../services/dbService';

interface StagedFile {
    name: string;
    words: string[];
}

interface AnalysisResult {
    totalWords: number;
    uniqueWords: number;
    internalDuplicateWords: number;
    dbDuplicateWords: number;
    nonAlphabeticWords: number;
    duplicatesMap: Map<string, number>;
    alphabeticalBreakdown: Record<string, number>;
}

const formatBytes = (bytes: number): string => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface WordManagementPanelProps {
    onNavigateToAnalysis: () => void;
}

const CHUNK_SIZE = 5000;

const processInChunks = async (
    items: string[],
    chunkProcessor: (chunk: string[]) => Promise<void>,
    progressUpdater: (processed: number, total: number) => void
) => {
    let processed = 0;
    const total = items.length;
    progressUpdater(0, total);

    for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = items.slice(i, i + CHUNK_SIZE);
        await chunkProcessor(chunk);
        processed += chunk.length;
        progressUpdater(processed, total);
        // Yield to the main thread to keep the UI responsive
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
    progressUpdater(total, total);
};


const WordManagementPanel: React.FC<WordManagementPanelProps> = ({ onNavigateToAnalysis }) => {
    const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [status, setStatus] = useState('');
    const [wordStorageUsage, setWordStorageUsage] = useState<number | null>(null);
    const [dbWords, setDbWords] = useState<Set<string>>(new Set());
    const [isLoadingDb, setIsLoadingDb] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveProgress, setSaveProgress] = useState({ processed: 0, total: 0 });

    const updateWordStorage = useCallback(() => {
        getStorageBreakdown().then(breakdown => {
            setWordStorageUsage(breakdown['words']?.size || 0);
        }).catch(() => setWordStorageUsage(0));
    }, []);

    const fetchDbWords = useCallback(async () => {
        setIsLoadingDb(true);
        try {
            const words = await getAllWords();
            setDbWords(new Set(words.map(w => w.toLowerCase())));
        } catch (e) {
            console.error("Failed to fetch DB words", e);
            setDbWords(new Set());
        } finally {
            setIsLoadingDb(false);
        }
    }, []);
    
    useEffect(() => {
        updateWordStorage();
        fetchDbWords();
    }, [updateWordStorage, fetchDbWords]);

    const analyzeFiles = useCallback((files: StagedFile[], currentDbWords: Set<string>) => {
        if (files.length === 0) {
            setAnalysis(null);
            return;
        }

        const allStagedWords: string[] = files.flatMap(file => file.words);
        const wordCounts = new Map<string, number>();
        const alphabeticalBreakdown: Record<string, number> = {};
        const nonAlphaRegex = /[^a-z]/i;
        const nonAlphabeticStagedWords = new Set<string>();
        
        let dbDuplicateWords = 0;

        allStagedWords.forEach(word => {
            const normalizedWord = word.toLowerCase();
            wordCounts.set(normalizedWord, (wordCounts.get(normalizedWord) || 0) + 1);
            
            if (currentDbWords.has(normalizedWord)) {
                dbDuplicateWords++;
            }

            if (nonAlphaRegex.test(normalizedWord)) {
                nonAlphabeticStagedWords.add(normalizedWord);
            }

            const firstLetter = normalizedWord.charAt(0).toUpperCase();
            if (/[A-Z]/.test(firstLetter)) {
                alphabeticalBreakdown[firstLetter] = (alphabeticalBreakdown[firstLetter] || 0) + 1;
            }
        });
        
        const duplicatesMap = new Map<string, number>();
        let internalDuplicateWords = 0;
        wordCounts.forEach((count, word) => {
            if (count > 1) {
                duplicatesMap.set(word, count);
                internalDuplicateWords += (count - 1);
            }
        });
        
        setAnalysis({
            totalWords: allStagedWords.length,
            uniqueWords: wordCounts.size,
            internalDuplicateWords,
            dbDuplicateWords,
            nonAlphabeticWords: nonAlphabeticStagedWords.size,
            duplicatesMap,
            alphabeticalBreakdown,
        });

    }, []);

    useEffect(() => {
        if (!isLoadingDb) {
            analyzeFiles(stagedFiles, dbWords);
        }
    }, [stagedFiles, dbWords, isLoadingDb, analyzeFiles]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            setStatus('No files selected.');
            return;
        }
        
        setStatus(`Reading ${files.length} file(s)...`);
        await fetchDbWords(); // Re-fetch DB words on new upload

        const readPromises = Array.from(files).map(file => {
            return new Promise<StagedFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const content = reader.result as string;
                    try {
                        let words: string[] = [];
                        if (file.name.endsWith('.json')) {
                            const data = JSON.parse(content);
                            if (Array.isArray(data)) words = data.filter(item => typeof item === 'string');
                            else reject(new Error('JSON must be an array of strings.'));
                        } else if (file.name.endsWith('.txt')) {
                            words = content.split(/\r?\n/).map(w => w.trim()).filter(Boolean);
                        } else {
                            reject(new Error(`Unsupported file type: ${file.name}`));
                        }
                        resolve({ name: file.name, words });
                    } catch (e: any) {
                        reject(new Error(`Error parsing ${file.name}: ${e.message}`));
                    }
                };
                reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
                reader.readAsText(file);
            });
        });
        
        try {
            const newFiles = await Promise.all(readPromises);
            setStagedFiles(prev => [...prev, ...newFiles]);
            setStatus(`${files.length} file(s) loaded and analyzed.`);
        } catch (error: any) {
            setStatus(`Error: ${error.message}`);
        }
    };
    
    const handleRemoveDuplicates = () => {
        if (!analysis || (analysis.internalDuplicateWords === 0 && analysis.dbDuplicateWords === 0)) return;
        
        const uniqueWords = new Set<string>(dbWords);
        const deDupedFiles = stagedFiles.map(file => {
            const fileUniqueWords: string[] = [];
            file.words.forEach(word => {
                const normalizedWord = word.toLowerCase();
                if (!uniqueWords.has(normalizedWord)) {
                    uniqueWords.add(normalizedWord);
                    fileUniqueWords.push(word);
                }
            });
            return { ...file, words: fileUniqueWords };
        }).filter(file => file.words.length > 0);
        
        setStagedFiles(deDupedFiles);
        setStatus(`Removed duplicates. Ready to save unique new words.`);
    };

    const handleCleanNonAlphabetic = () => {
        if (!analysis || analysis.nonAlphabeticWords === 0) return;
        
        const nonAlphaRegex = /[^a-z]/i;
        const cleanedFiles = stagedFiles.map(file => {
            const cleanedWords = file.words.filter(word => !nonAlphaRegex.test(word));
            return { ...file, words: cleanedWords };
        }).filter(file => file.words.length > 0);
        
        setStagedFiles(cleanedFiles);
        setStatus(`Removed non-alphabetic words. Ready to save.`);
    };

    const handleClearAndSave = async () => {
        if (stagedFiles.length === 0) return;
        const allWords = stagedFiles.flatMap(f => f.words);
        const uniqueWords = Array.from(new Set(allWords.map(w => w.toLowerCase())));

        setIsSaving(true);
        setStatus('Clearing old words...');
        setSaveProgress({ processed: 0, total: uniqueWords.length });

        try {
            await clearWords();
            setStatus('Saving new words in chunks...');
            await processInChunks(uniqueWords, addWords, (processed, total) => {
                setSaveProgress({ processed, total });
            });
            setStatus(`Successfully saved ${uniqueWords.length} unique words. Reload the app to use them.`);
        } catch (error) {
            console.error("Error during clear and save:", error);
            setStatus("An error occurred during save.");
            setSaveProgress({ processed: 0, total: 0 });
        } finally {
            setStagedFiles([]);
            await fetchDbWords();
            updateWordStorage();
            setIsSaving(false);
        }
    };

    const handleMerge = async () => {
        if (stagedFiles.length === 0) return;
        const allWords = stagedFiles.flatMap(f => f.words);
        const uniqueNewWords = Array.from(new Set(allWords.map(w => w.toLowerCase())))
                                    .filter(w => !dbWords.has(w));
        
        if (uniqueNewWords.length === 0) {
            setStatus('No new unique words to merge. Staging area cleared.');
            setStagedFiles([]);
            return;
        }

        setIsSaving(true);
        setStatus(`Merging ${uniqueNewWords.length} new words in chunks...`);
        setSaveProgress({ processed: 0, total: uniqueNewWords.length });
        
        try {
            await processInChunks(uniqueNewWords, addWords, (processed, total) => {
                setSaveProgress({ processed, total });
            });
            setStatus(`Successfully merged ${uniqueNewWords.length} new words. Reload the app to use them.`);
        } catch (error) {
            console.error("Error during merge:", error);
            setStatus("An error occurred during merge.");
            setSaveProgress({ processed: 0, total: 0 });
        } finally {
            setStagedFiles([]);
            await fetchDbWords();
            updateWordStorage();
            setIsSaving(false);
        }
    };

    const handleClearAllFromDB = async () => {
        setStatus('Clearing all custom words from the database...');
        await clearWords();
        setStatus('Custom words cleared. The default list will be used on next reload.');
        setStagedFiles([]);
        await fetchDbWords();
        updateWordStorage();
    };
    
    const sortedAlphabetical = useMemo(() => {
        if (!analysis) return [];
        return Object.entries(analysis.alphabeticalBreakdown).sort((a,b) => a[0].localeCompare(b[0]));
    }, [analysis]);

    return (
        <div className="p-4 text-sm text-neutral-700 dark:text-gray-300">
            <h3 className="font-bold text-lg mb-2">Custom Word List Management</h3>
            <p className="mb-4 text-xs text-neutral-500 dark:text-gray-400">
                Upload custom word lists (.txt/.json) to replace or merge with the existing autocomplete dictionary.
            </p>

            <div className="mb-4 p-3 bg-neutral-100 dark:bg-gray-800/50 rounded-lg border border-neutral-200 dark:border-gray-700/50 flex justify-between items-center">
                <div>
                    <p className="font-semibold">Current Word DB Usage:</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{formatBytes(wordStorageUsage || 0)}</p>
                        <p className="text-xs">({isLoadingDb ? '...' : dbWords.size.toLocaleString()} words)</p>
                    </div>
                </div>
                <button onClick={onNavigateToAnalysis} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-700/50 text-neutral-700 dark:text-gray-200 rounded-lg border border-neutral-300 dark:border-gray-600 hover:bg-neutral-50 dark:hover:bg-gray-600/50 transition-colors">
                    <BarChart className="h-4 w-4" />
                    <span className="text-xs font-semibold">Detailed Analysis</span>
                </button>
            </div>
            
            <div className="mb-4">
                 <label htmlFor="word-file-upload" className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border-2 border-dashed border-blue-300 dark:border-blue-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                    <UploadCloud className="h-5 w-5" />
                    <span className="font-semibold">Upload Word File(s)</span>
                </label>
                <input id="word-file-upload" type="file" accept=".txt,.json" onChange={handleFileChange} className="hidden" multiple disabled={isSaving} />
            </div>
            
            {status && <div className="mb-4 p-2 bg-neutral-100 dark:bg-gray-900 rounded text-xs font-mono">{status}</div>}

            {isSaving && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs font-mono mb-1">
                        <span>Saving...</span>
                        <span>{saveProgress.processed.toLocaleString()} / {saveProgress.total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-150" style={{ width: `${(saveProgress.total > 0 ? saveProgress.processed / saveProgress.total : 0) * 100}%` }}></div>
                    </div>
                </div>
            )}
            
            {stagedFiles.length > 0 && !isSaving && (
                <div className="mb-4 p-4 bg-neutral-50 dark:bg-gray-800/40 rounded-lg border border-neutral-200 dark:border-gray-700">
                    <h4 className="font-bold mb-3 text-base">Staging Area & Analysis</h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-center">
                        <div className="p-2 bg-white dark:bg-gray-700/50 rounded-lg">
                            <p className="text-xs text-neutral-500 dark:text-gray-400">Total Words</p>
                            <p className="text-lg font-bold">{analysis?.totalWords.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-gray-700/50 rounded-lg">
                            <p className="text-xs text-neutral-500 dark:text-gray-400">Unique Words</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">{analysis?.uniqueWords.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-gray-700/50 rounded-lg">
                            <p className="text-xs text-neutral-500 dark:text-gray-400">Non-Alphabetic</p>
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-500">{analysis?.nonAlphabeticWords.toLocaleString()}</p>
                        </div>
                        <div className="p-2 bg-white dark:bg-gray-700/50 rounded-lg">
                            <p className="text-xs text-neutral-500 dark:text-gray-400">Internal Duplicates</p>
                            <p className="text-lg font-bold text-yellow-600 dark:text-yellow-500">{analysis?.internalDuplicateWords.toLocaleString()}</p>
                        </div>
                         <div className="p-2 bg-white dark:bg-gray-700/50 rounded-lg">
                            <p className="text-xs text-neutral-500 dark:text-gray-400">DB Duplicates</p>
                            <p className="text-lg font-bold text-red-600 dark:text-red-400">{analysis?.dbDuplicateWords.toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-row items-center gap-3 mb-4">
                        {analysis && (analysis.internalDuplicateWords > 0 || analysis.dbDuplicateWords > 0) && (
                            <button onClick={handleRemoveDuplicates} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors">
                                <Sparkles className="h-4 w-4"/> Remove All Duplicates
                            </button>
                        )}
                        {analysis && analysis.nonAlphabeticWords > 0 && (
                             <button onClick={handleCleanNonAlphabetic} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors">
                                <Wand2 className="h-4 w-4"/> Clean Non-Alphabetic Words
                            </button>
                        )}
                    </div>

                    <details className="mb-4">
                        <summary className="font-semibold cursor-pointer text-xs">Show Alphabetical Breakdown</summary>
                        <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 text-xs font-mono p-2 bg-white dark:bg-gray-900/50 rounded">
                            {sortedAlphabetical.length > 0 ? sortedAlphabetical.map(([letter, count]) => (
                                <div key={letter}>
                                    <span className="font-bold">{letter}:</span> {count.toLocaleString()}
                                </div>
                            )) : <span>No words to analyze.</span>}
                        </div>
                    </details>
                    
                    <div className="flex flex-row items-center justify-between gap-3">
                        <button
                            onClick={handleClearAndSave}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors"
                        >
                            <Save className="h-4 w-4"/> Clear & Save New
                        </button>
                         <button
                            onClick={handleMerge}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                        >
                            <GitMerge className="h-4 w-4"/> Merge with Existing
                        </button>
                    </div>
                </div>
            )}

            <button
                onClick={handleClearAllFromDB}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Trash2 className="h-4 w-4"/> Clear All from DB
            </button>
        </div>
    );
};

export default WordManagementPanel;