import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { ConsoleLogEntry } from '../types';
import { initAppLogger } from '../services/appLogger';

interface DebugContextType {
    logs: ConsoleLogEntry[];
    addLog: (log: Omit<ConsoleLogEntry, 'id' | 'timestamp'>) => void;
    logError: (error: any) => void;
    clearLogs: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export const DebugProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<ConsoleLogEntry[]>([]);

    const addLog = useCallback((log: Omit<ConsoleLogEntry, 'id' | 'timestamp'>) => {
        const newLog: ConsoleLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            ...log,
        };

        const isSummarizerLog = log.message.startsWith('**Planner Context Updated**');
        const isLtmLog = log.message.startsWith('**LTM Successfully Updated**');

        setLogs(prev => {
            let logsToUpdate = prev;

            if (isSummarizerLog) {
                // Filter out previous summarizer logs
                logsToUpdate = logsToUpdate.filter(l => !l.message.startsWith('**Planner Context Updated**'));
            }
            if (isLtmLog) {
                 // Filter out previous LTM logs from the (potentially already filtered) array
                logsToUpdate = logsToUpdate.filter(l => !l.message.startsWith('**LTM Successfully Updated**'));
            }
            
            return [...logsToUpdate, newLog];
        });
    }, []);

    const logError = useCallback((error: any) => {
        console.error("[DEV CONSOLE]", error); // Also log to the actual browser console
        addLog({
            level: 'error',
            message: error.message || String(error),
            stack: error.stack,
        });
    }, [addLog]);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    useEffect(() => {
        // Connect the global appLogger to this React context's state.
        // Now any module can call appLogger.log and it will appear in the Dev Console.
        initAppLogger(addLog);
    }, [addLog]);

    return (
        <DebugContext.Provider value={{ logs, addLog, logError, clearLogs }}>
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