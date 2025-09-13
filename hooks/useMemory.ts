
import { useState, useEffect } from 'react';
import { LTM, CodeSnippet, UserProfile } from '../types';
import { getLtm, saveLtm, getCodeMemory, saveCodeMemory, getUserProfile, saveUserProfile } from '../services/dbService';

export const useMemory = () => {
    const [ltm, setLtm] = useState<LTM>([]);
    const [codeMemory, setCodeMemory] = useState<CodeSnippet[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile>({ name: null });

    useEffect(() => {
        getLtm().then(setLtm).catch(e => console.error("Failed to load LTM from DB", e));
        getCodeMemory().then(setCodeMemory).catch(e => console.error("Failed to load Code Memory from DB", e));
        getUserProfile().then(setUserProfile).catch(e => console.error("Failed to load User Profile from DB", e));
    }, []);

    useEffect(() => {
        saveLtm(ltm).catch(e => console.error("Failed to save LTM to DB", e));
    }, [ltm]);

    useEffect(() => {
        saveCodeMemory(codeMemory).catch(e => console.error("Failed to save Code Memory to DB", e));
    }, [codeMemory]);
    
    useEffect(() => {
        saveUserProfile(userProfile).catch(e => console.error("Failed to save User Profile to DB", e));
    }, [userProfile]);

    return {
        ltm,
        setLtm,
        codeMemory,
        setCodeMemory,
        userProfile,
        setUserProfile,
    };
};
