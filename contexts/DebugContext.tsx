import React, { createContext, useState, useCallback, useContext } from 'react';
import { ConsoleLogEntry } from '../types';

interface DebugContextType {
    logs: ConsoleLogEntry[];
    logError: (error: any) => void;
    clearLogs: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);

    const logError = useCallback((error: any) => {
        console.error("[DEV CONSOLE]", error); // Also log to the actual browser console
        const newLog: ConsoleLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            message: error.message || String(error),
            stack: error.stack,
        };
        setLogs(prev => [...prev, newLog]);
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return (
        <DebugContext.Provider value={{ logs, logError, clearLogs }}>
            {children}
        </DebugContext.Provider>
    );
};

export const useDebug = (): DebugContextType => {
    const context = useContext(DebugContext);
    if (!context) {
        throw new Error('useDebug must be used within a DebugProvider');
    }
    return context;
};
