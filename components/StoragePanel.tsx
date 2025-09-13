


import React, { useState, useEffect, useCallback } from 'react';
import { Database, HardDrive, MessageSquare, Brain, Code, User, Languages, List } from 'lucide-react';
import { getStorageBreakdown, StoreUsageDetails } from '../services/dbService';

const formatBytes = (bytes: number, decimals = 2): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const storeMetadata: Record<string, { title: string, icon: React.ElementType, color: string }> = {
    conversations: { title: 'Conversations', icon: MessageSquare, color: 'bg-blue-500' },
    ltm: { title: 'Long-Term Memory', icon: Brain, color: 'bg-purple-500' },
    codeMemory: { title: 'Code Snippets', icon: Code, color: 'bg-green-500' },
    userProfile: { title: 'User Profile', icon: User, color: 'bg-teal-500' },
    translatorUsage: { title: 'Translator Usage', icon: Languages, color: 'bg-pink-500' },
    words: { title: 'Custom Words', icon: List, color: 'bg-indigo-500' },
    settings: { title: 'App Settings', icon: HardDrive, color: 'bg-gray-500' },
};

const StorageIndicator: React.FC<{
    title: string;
    icon: React.ElementType;
    color: string;
    usage: number;
    totalUsage: number;
    count: number;
}> = ({ title, icon: Icon, color, usage, totalUsage, count }) => {
    const percentage = totalUsage > 0 ? (usage / totalUsage) * 100 : 0;

    return (
        <div className="p-3 bg-neutral-100 dark:bg-gray-800/50 rounded-lg border border-neutral-200 dark:border-gray-700/50">
            <div className="flex items-center gap-3 mb-2">
                <Icon className="h-5 w-5 text-neutral-500 dark:text-gray-400" />
                <div>
                    <h4 className="text-sm font-bold text-neutral-800 dark:text-gray-200">{title}</h4>
                    <p className="text-xs text-neutral-500 dark:text-gray-400">{count.toLocaleString()} {count === 1 ? 'item' : 'items'}</p>
                </div>
                 <div className="ml-auto text-right">
                    <p className="text-sm font-semibold">{formatBytes(usage)}</p>
                    <p className="text-xs text-neutral-500 dark:text-gray-400">{percentage.toFixed(1)}%</p>
                </div>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                    className={`${color} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};


const StoragePanel: React.FC<{ excludeStores?: string[] }> = ({ excludeStores = [] }) => {
    const [dbEstimate, setDbEstimate] = useState<{ usage: number; quota: number } | null>(null);
    const [breakdown, setBreakdown] = useState<Record<string, StoreUsageDetails> | null>(null);
    const [localStorageUsage, setLocalStorageUsage] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);

    const calculateStorage = useCallback(async () => {
        setIsLoading(true);
        
        // IndexedDB
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                setDbEstimate({
                    usage: estimate.usage || 0,
                    quota: estimate.quota || 0,
                });
            } catch (error) {
                console.error("Could not get IndexedDB storage estimate:", error);
                setDbEstimate(null);
            }
        }
        try {
            const breakdownDetails = await getStorageBreakdown();
            setBreakdown(breakdownDetails);
        } catch (error) {
            console.error("Could not get storage breakdown:", error);
            setBreakdown(null);
        }

        // LocalStorage
        try {
            let totalUsage = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key === 'theme' || key.includes('active_conversation_id'))) {
                    const value = localStorage.getItem(key) || '';
                    totalUsage += new Blob([key + value]).size;
                }
            }
            setLocalStorageUsage(totalUsage);
        } catch (error) {
            console.error("Could not calculate LocalStorage usage:", error);
        }
        
        setIsLoading(false);
    }, []);

    useEffect(() => {
        calculateStorage();
    }, [calculateStorage]);
    
    if (isLoading) {
        return <div className="p-4 text-center text-neutral-500 dark:text-gray-400">Calculating storage usage...</div>
    }

    const totalDbUsage = dbEstimate?.usage ?? Object.values(breakdown || {}).reduce((sum, store) => sum + store.size, 0);

    return (
        <div className="p-4 text-sm">
            <div className="p-4 bg-neutral-100 dark:bg-gray-800/50 rounded-lg border border-neutral-200 dark:border-gray-700/50 mb-4">
                <div className="flex items-center gap-3 mb-3">
                    <Database className="h-6 w-6 text-neutral-500 dark:text-gray-400" />
                    <h3 className="text-lg font-bold text-neutral-800 dark:text-gray-200">IndexedDB Storage</h3>
                </div>
                {dbEstimate?.quota ? (
                    <>
                        <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                            <div
                                className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${(totalDbUsage / dbEstimate.quota) * 100}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs mt-1.5 text-neutral-500 dark:text-gray-400">
                            <span>{formatBytes(totalDbUsage)} Used</span>
                            <span>{formatBytes(dbEstimate.quota)} Quota</span>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-neutral-500 dark:text-gray-400">
                        {formatBytes(totalDbUsage)} Used (Quota information not available)
                    </p>
                )}
            </div>
            
            <div className="space-y-3">
                {breakdown && Object.entries(breakdown)
                    // Fix: The 'details' object was not destructured from the array item in the filter, causing a reference error.
                    .filter(([storeName, details]) => !excludeStores.includes(storeName) && details.count > 0)
                    .sort(([, a], [, b]) => b.size - a.size)
                    .map(([storeName, details]) => {
                        const meta = storeMetadata[storeName] || { title: storeName, icon: Database, color: 'bg-gray-500' };
                        return (
                            <StorageIndicator
                                key={storeName}
                                title={meta.title}
                                icon={meta.icon}
                                color={meta.color}
                                usage={details.size}
                                totalUsage={totalDbUsage}
                                count={details.count}
                            />
                        );
                })}
            </div>

            <div className="p-4 bg-neutral-100 dark:bg-gray-800/50 rounded-lg border border-neutral-200 dark:border-gray-700/50 mt-4">
                 <div className="flex items-center gap-3">
                    <HardDrive className="h-6 w-6 text-neutral-500 dark:text-gray-400" />
                    <div>
                        <h3 className="text-lg font-bold text-neutral-800 dark:text-gray-200">Local Storage</h3>
                        <p className="text-xs text-neutral-500 dark:text-gray-400">Used for theme & active session state.</p>
                    </div>
                    <p className="ml-auto text-right text-sm font-semibold">{formatBytes(localStorageUsage)}</p>
                </div>
            </div>

             {!dbEstimate && !breakdown && (
                <p className="text-neutral-500 dark:text-gray-400 text-center p-8">Could not retrieve storage information for this browser.</p>
            )}
        </div>
    );
};

export default StoragePanel;