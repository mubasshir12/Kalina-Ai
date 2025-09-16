import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Database, MessageSquare, Brain, Code, User, HardDrive } from 'lucide-react';
import { getStorageBreakdown, StoreUsageDetails } from '../services/dbService';

const formatBytes = (bytes: number, decimals = 2): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const userFriendlyStoreMetadata: Record<string, { title: string, icon: React.ElementType, color: string, description: string }> = {
    conversations: { title: 'Chat History', icon: MessageSquare, color: 'bg-blue-500', description: 'All your saved conversations and messages.' },
    ltm: { title: 'AI Memory', icon: Brain, color: 'bg-purple-500', description: 'Facts and preferences the AI has learned about you.' },
    codeMemory: { title: 'Saved Code', icon: Code, color: 'bg-green-500', description: 'Code snippets generated in your chats.' },
    userProfile: { title: 'Your Profile', icon: User, color: 'bg-teal-500', description: 'Your name and other profile information.' },
    settings: { title: 'App Preferences', icon: HardDrive, color: 'bg-gray-500', description: 'Your saved settings, like the API key.' },
};

const storesToShow = ['conversations', 'ltm', 'codeMemory', 'userProfile', 'settings'];

interface StorageIndicatorProps {
    title: string;
    icon: React.ElementType;
    color: string;
    description: string;
    usage: number;
    totalUsage: number;
    count: number;
}

const StorageIndicator: React.FC<StorageIndicatorProps> = ({ title, icon: Icon, color, description, usage, totalUsage, count }) => {
    const percentage = totalUsage > 0 ? (usage / totalUsage) * 100 : 0;

    return (
        <div className="p-4 bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-xl border border-neutral-200 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-3">
                <Icon className="h-6 w-6 text-neutral-500 dark:text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-neutral-800 dark:text-gray-200">{title}</h4>
                    <p className="text-xs text-neutral-500 dark:text-gray-400 truncate">{description}</p>
                </div>
                 <div className="ml-auto text-right flex-shrink-0">
                    <p className="text-base font-semibold">{formatBytes(usage)}</p>
                    <p className="text-xs text-neutral-500 dark:text-gray-400">{count.toLocaleString()} {count === 1 ? 'item' : 'items'}</p>
                </div>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

interface StorageManagementProps {
    onBack: () => void;
}

const StorageManagement: React.FC<StorageManagementProps> = ({ onBack }) => {
    const [breakdown, setBreakdown] = useState<Record<string, StoreUsageDetails> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dbEstimate, setDbEstimate] = useState<{ usage: number; quota: number } | null>(null);

    const calculateStorage = useCallback(async () => {
        setIsLoading(true);
        if (navigator.storage && navigator.storage.estimate) {
            try {
                const estimate = await navigator.storage.estimate();
                setDbEstimate({
                    usage: estimate.usage || 0,
                    quota: estimate.quota || 0,
                });
            } catch (error) {
                console.error("Could not get storage estimate:", error);
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
        setIsLoading(false);
    }, []);

    useEffect(() => {
        calculateStorage();
    }, [calculateStorage]);

    const calculatedBreakdownUsage = React.useMemo(() => {
        if (!breakdown) return 0;
        return Object.entries(breakdown)
            .filter(([storeName]) => storesToShow.includes(storeName))
            .reduce((sum, [, details]) => sum + details.size, 0);
    }, [breakdown]);
    
    const totalUsage = dbEstimate?.usage ?? calculatedBreakdownUsage;

    if (isLoading) {
        return (
            <main className="relative z-10 flex items-center justify-center p-4 md:p-6">
                 <p className="text-center text-neutral-500 dark:text-gray-400">Calculating storage usage...</p>
            </main>
        );
    }

    return (
        <main className="relative z-10 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-gray-800 transition-colors mr-2 md:mr-4" aria-label="Back to chat">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-gray-200">Storage Management</h1>
                </div>

                 <div className="bg-white/80 dark:bg-[#1e1f22]/80 backdrop-blur-sm rounded-2xl shadow-sm border border-neutral-200 dark:border-gray-700 mb-6 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Database className="h-6 w-6 text-neutral-500 dark:text-gray-400" />
                        <div>
                            <h2 className="text-lg font-semibold text-neutral-800 dark:text-gray-200">Total Storage Usage</h2>
                             <p className="text-sm text-neutral-500 dark:text-gray-400">How much space this app is using on your device.</p>
                        </div>
                    </div>
                    {dbEstimate?.quota ? (
                        <>
                            <div className="w-full bg-neutral-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-3">
                                <div
                                    className="bg-gradient-to-r from-amber-400 to-amber-600 h-4 rounded-full transition-all duration-500"
                                    style={{ width: `${(totalUsage / dbEstimate.quota) * 100}%` }}
                                ></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center text-xs sm:text-sm">
                                <div>
                                    <p className="font-semibold text-neutral-800 dark:text-gray-200">{formatBytes(totalUsage)}</p>
                                    <p className="text-neutral-500 dark:text-gray-400">Used</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-neutral-800 dark:text-gray-200">{formatBytes(dbEstimate.quota - totalUsage)}</p>
                                    <p className="text-neutral-500 dark:text-gray-400">Remaining</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-neutral-800 dark:text-gray-200">{formatBytes(dbEstimate.quota)}</p>
                                    <p className="text-neutral-500 dark:text-gray-400">Total</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-4xl font-extrabold text-amber-600 dark:text-amber-400">{formatBytes(totalUsage)}</p>
                    )}
                </div>

                <div className="space-y-4">
                    {breakdown ? (
                        storesToShow
                            .map(storeName => ({ storeName, details: breakdown[storeName] }))
                            .filter(({ details }) => details && details.count > 0)
                            .sort((a, b) => b.details.size - a.details.size)
                            .map(({ storeName, details }) => {
                                const meta = userFriendlyStoreMetadata[storeName];
                                return (
                                    <StorageIndicator
                                        key={storeName}
                                        title={meta.title}
                                        icon={meta.icon}
                                        color={meta.color}
                                        description={meta.description}
                                        usage={details.size}
                                        totalUsage={totalUsage}
                                        count={details.count}
                                    />
                                );
                            })
                    ) : (
                        <p className="text-neutral-500 dark:text-gray-400 text-center p-8">Could not retrieve storage information.</p>
                    )}
                </div>
            </div>
        </main>
    );
};

export default StorageManagement;