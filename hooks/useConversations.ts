
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Conversation, ChatMessage as ChatMessageType } from '../types';
import { getConversations, saveConversation, deleteConversation as deleteConversationFromDB } from '../services/dbService';

export const useConversations = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    
    useEffect(() => {
        getConversations().then(storedConvos => {
            if (storedConvos) {
                const parsedConvos = storedConvos.map(convo => ({
                    ...convo,
                    createdAt: convo.createdAt || new Date().toISOString(),
                    plannerContext: convo.plannerContext || [],
                }));
                setConversations(parsedConvos);
            }
        }).catch(e => console.error("Failed to load conversations from IndexedDB", e));
    }, []);

    const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
        try {
            return localStorage.getItem('kalina_active_conversation_id');
        } catch (e) {
            console.error("Failed to parse active conversation ID from localStorage", e);
            return null;
        }
    });

    useEffect(() => {
        try {
            if (activeConversationId) {
                localStorage.setItem('kalina_active_conversation_id', activeConversationId);
            } else {
                localStorage.removeItem('kalina_active_conversation_id');
            }
        } catch (e) {
            console.error("Failed to save active conversation ID to localStorage", e);
        }
    }, [activeConversationId]);

    const activeConversation = useMemo(() =>
        conversations.find(c => c.id === activeConversationId),
        [conversations, activeConversationId]
    );

    const sortedConversations = useMemo(() => {
        return [...conversations].sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            if (a.createdAt && b.createdAt) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
            return 0;
        });
    }, [conversations]);

    const updateConversation = useCallback((conversationId: string, updater: (convo: Conversation) => Conversation) => {
        setConversations(prev => {
            let updatedConvo: Conversation | null = null;
            const newConvos = prev.map(c => {
                if (c.id === conversationId) {
                    updatedConvo = updater(c);
                    return updatedConvo;
                }
                return c;
            });

            if (updatedConvo) {
                saveConversation(updatedConvo).catch(e => {
                    console.error("Failed to save updated conversation to IndexedDB", e);
                });
            }
            return newConvos;
        });
    }, []);

    const updateConversationMessages = useCallback((conversationId: string, updater: (messages: ChatMessageType[]) => ChatMessageType[]) => {
        updateConversation(conversationId, c => ({ ...c, messages: updater(c.messages) }));
    }, [updateConversation]);
    
    const handleNewChat = useCallback(() => {
        const newConversationId = crypto.randomUUID();
        const newConversation: Conversation = {
            id: newConversationId,
            title: "New Chat",
            messages: [],
            createdAt: new Date().toISOString(),
        };

        saveConversation(newConversation).catch(e => {
            console.error("Failed to save new conversation to IndexedDB", e);
        });

        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newConversationId);
    }, []);

    const handleSelectConversation = useCallback((id: string) => {
        // Verify conversation exists before setting it as active
        if (conversations.some(c => c.id === id)) {
            setActiveConversationId(id);
        }
    }, [conversations]);

    const handleRenameConversation = useCallback((id: string, newTitle: string) => {
        updateConversation(id, c => ({ ...c, title: newTitle }));
    }, [updateConversation]);

    const handleDeleteConversation = useCallback((id: string) => {
        deleteConversationFromDB(id).catch(e => {
            console.error("Failed to delete conversation from IndexedDB", e);
        });

        const remainingConvos = conversations.filter(c => c.id !== id);
        setConversations(remainingConvos);

        if (activeConversationId === id) {
            const newActiveId = remainingConvos.length > 0 ? (sortedConversations.find(c => c.id !== id)?.id ?? null) : null;
            setActiveConversationId(newActiveId);
        }
    }, [activeConversationId, conversations, sortedConversations]);

    const handlePinConversation = useCallback((id: string) => {
        updateConversation(id, c => ({ ...c, isPinned: !c.isPinned }));
    }, [updateConversation]);

    return {
        conversations,
        setConversations,
        activeConversationId,
        setActiveConversationId,
        activeConversation,
        sortedConversations,
        updateConversation,
        updateConversationMessages,
        handleNewChat,
        handleSelectConversation,
        handleRenameConversation,
        handleDeleteConversation,
        handlePinConversation
    };
};
