import { ConsoleLogEntry } from '../types';

type AppLogSubscriber = (log: Omit<ConsoleLogEntry, 'id' | 'timestamp'>) => void;

let logSubscriber: AppLogSubscriber | null = null;
// Queue to hold logs that are created before the subscriber is ready.
let logQueue: Omit<ConsoleLogEntry, 'id' | 'timestamp'>[] = [];

/**
 * Initializes the logger by connecting it to the React UI's state management.
 * This should be called once from the DebugProvider.
 * @param subscriber The function that will add the log to the app's state.
 */
export const initAppLogger = (subscriber: AppLogSubscriber) => {
    logSubscriber = subscriber;
    // If there are any queued logs, process them now.
    if (logQueue.length > 0) {
        logQueue.forEach(log => {
            // Check subscriber again in case it was somehow cleared between the outer check and here.
            if (logSubscriber) {
                logSubscriber(log);
            }
        });
        logQueue = []; // Clear the queue
    }
};

const logToApp = (level: 'log' | 'warn' | 'error', message: string, error?: any) => {
    const stack = error?.stack || (level === 'error' ? (new Error()).stack : undefined);
    const fullMessage = `${message}${error && error.message ? `: ${error.message}` : ''}`;
    const logEntry = { level, message: fullMessage, stack };

    // If the subscriber is ready, log immediately. Otherwise, queue the log.
    if (logSubscriber) {
        logSubscriber(logEntry);
    } else {
        logQueue.push(logEntry);
    }
};

/**
 * A globally accessible logger for both browser and in-app dev consoles.
 * Use this in services or other non-React modules.
 */
export const appLogger = {
    log: (message: string) => {
        console.log(message);
        logToApp('log', message);
    },
    warn: (message: string) => {
        console.warn(message);
        logToApp('warn', message);
    },
    error: (message: string, error?: any) => {
        console.error(message, error);
        logToApp('error', message, error);
    }
};