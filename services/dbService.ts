
import { Conversation, LTM, CodeSnippet, UserProfile } from '../types';

const DB_NAME = 'KalinaAppDB';
const DB_VERSION = 1; 
const STORES = {
    CONVERSATIONS: 'conversations',
    SETTINGS: 'settings',
    LTM: 'ltm',
    CODE_MEMORY: 'codeMemory',
    USER_PROFILE: 'userProfile',
    TRANSLATOR_USAGE: 'translatorUsage',
    WORDS: 'words'
};

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      Object.values(STORES).forEach(storeName => {
          if (!dbInstance.objectStoreNames.contains(storeName)) {
              dbInstance.createObjectStore(storeName);
          }
      });
    };
  });
};

// Generic helpers
const getFromDB = async <T>(storeName: string, key: IDBValidKey): Promise<T | undefined> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
    });
};

const getAllFromDB = async <T>(storeName: string): Promise<T[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
    });
};

const saveToDB = async <T>(storeName: string, value: T, key?: IDBValidKey): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        // For stores with a key path, key is ignored, but we pass it for flexibility.
        const request = store.put(value, key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const deleteFromDB = async (storeName: string, key: IDBValidKey): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        store.delete(key);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const clearStore = async (storeName: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- App-specific functions ---

// Conversations
export const getConversations = () => getAllFromDB<Conversation>(STORES.CONVERSATIONS);
export const saveConversation = (convo: Conversation) => saveToDB(STORES.CONVERSATIONS, convo, convo.id);
export const deleteConversation = (id: string) => deleteFromDB(STORES.CONVERSATIONS, id);

// Settings (API Key)
export const getSetting = <T>(key: string) => getFromDB<T>(STORES.SETTINGS, key);
export const saveSetting = (key: string, value: any) => saveToDB(STORES.SETTINGS, value, key);

// Singleton data stores
const SINGLETON_KEY = 'singleton';
export const getLtm = () => getFromDB<LTM>(STORES.LTM, SINGLETON_KEY).then(res => res || []);
export const saveLtm = (ltm: LTM) => saveToDB(STORES.LTM, ltm, SINGLETON_KEY);

export const getCodeMemory = () => getFromDB<CodeSnippet[]>(STORES.CODE_MEMORY, SINGLETON_KEY).then(res => res || []);
export const saveCodeMemory = (memory: CodeSnippet[]) => saveToDB(STORES.CODE_MEMORY, memory, SINGLETON_KEY);

export const getUserProfile = () => getFromDB<UserProfile>(STORES.USER_PROFILE, SINGLETON_KEY).then(res => res || { name: null });
export const saveUserProfile = (profile: UserProfile) => saveToDB(STORES.USER_PROFILE, profile, SINGLETON_KEY);

export const getTranslatorUsage = () => getFromDB<{ input: number, output: number }>(STORES.TRANSLATOR_USAGE, SINGLETON_KEY).then(res => res || { input: 0, output: 0 });
export const saveTranslatorUsage = (usage: { input: number, output: number }) => saveToDB(STORES.TRANSLATOR_USAGE, usage, SINGLETON_KEY);

// Word list functions
export const addWords = async (words: string[]) => {
    const dbInstance = await openDB();
    const transaction = dbInstance.transaction(STORES.WORDS, 'readwrite');
    const store = transaction.objectStore(STORES.WORDS);
    words.forEach(word => { store.put(word, word); });
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};
export const getAllWords = () => getAllFromDB<string>(STORES.WORDS);
export const clearWords = () => clearStore(STORES.WORDS);


// Storage Panel utility
export interface StoreUsageDetails {
    count: number;
    size: number;
}
const calculateObjectSize = (obj: any): number => new Blob([JSON.stringify(obj)]).size;

export const getStorageBreakdown = async (): Promise<Record<string, StoreUsageDetails>> => {
    const breakdown: Record<string, StoreUsageDetails> = {};
    const db = await openDB();

    for (const storeName of Object.values(STORES)) {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const allRecords = await new Promise<any[]>((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        breakdown[storeName] = {
            count: allRecords.length,
            size: calculateObjectSize(allRecords)
        };
    }
    return breakdown;
};
