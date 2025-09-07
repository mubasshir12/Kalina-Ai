import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Conversation } from '../types';
import { Plus, MoreVertical, Pencil, Trash2, Pin, Search, X } from 'lucide-react';
import { useDraggableSheet } from '../hooks/useDraggableSheet';

interface ChatHistorySheetProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onRenameConversation: (id: string, newTitle: string) => void;
    onDeleteConversation: (id: string) => void;
    onPinConversation: (id: string) => void;
}

interface MenuConfig {
    id: string | null;
    rect: DOMRect | null;
}

const ChatHistorySheet: React.FC<ChatHistorySheetProps> = ({
    isOpen,
    onClose,
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewChat,
    onRenameConversation,
    onDeleteConversation,
    onPinConversation,
}) => {
    const [menuConfig, setMenuConfig] = useState<MenuConfig>({ id: null, rect: null });
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const { sheetStyle, handleRef } = useDraggableSheet(sheetRef, onClose, isOpen);

    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) {
            return conversations;
        }
        return conversations.filter(convo =>
            convo.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [conversations, searchQuery]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuConfig({ id: null, rect: null });
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingId]);
    
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery('');
            setMenuConfig({ id: null, rect: null });
        }
    }, [isOpen]);

    const handleToggleMenu = (event: React.MouseEvent, conversationId: string) => {
        event.stopPropagation();
        if (menuConfig.id === conversationId) {
            setMenuConfig({ id: null, rect: null });
            return;
        }
        setMenuConfig({ id: conversationId, rect: event.currentTarget.getBoundingClientRect() });
    };

    const handleStartRename = (convo: Conversation) => {
        setMenuConfig({ id: null, rect: null });
        setRenamingId(convo.id);
        setRenameValue(convo.title);
    };

    const handleFinishRename = () => {
        if (renamingId && renameValue.trim()) {
            onRenameConversation(renamingId, renameValue.trim());
        }
        setRenamingId(null);
    };

    const activeMenuConvo = menuConfig.id ? filteredConversations.find(c => c.id === menuConfig.id) : null;

    const calculateMenuPosition = (rect: DOMRect): React.CSSProperties => {
        const menuHeight = 128; // Approximate height of the menu
        const menuWidth = 160; // w-40
        const margin = 8;

        let top: number;
        if ((window.innerHeight - rect.bottom) < (menuHeight + margin) && rect.top > (menuHeight + margin)) {
            // Open upwards if not enough space below
            top = rect.top - menuHeight - (margin / 2);
        } else {
            // Open downwards by default
            top = rect.bottom + (margin / 2);
        }

        // Position horizontally, ensuring it stays within the viewport
        let left = rect.right - menuWidth;
        if (left < margin) left = margin;
        if ((left + menuWidth) > (window.innerWidth - margin)) {
            left = window.innerWidth - menuWidth - margin;
        }
        
        return { top: `${top}px`, left: `${left}px` };
    };

    const closeSheet = () => {
        setMenuConfig({ id: null, rect: null });
        onClose();
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/50 z-20 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={closeSheet}
                aria-hidden="true"
            ></div>
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-[#1e1f22] rounded-t-2xl shadow-2xl transition-transform duration-300 ease-in-out ${
                    isOpen ? '' : 'translate-y-full'
                } h-[40dvh] sm:h-auto sm:max-h-[60vh] flex flex-col`}
                style={isOpen ? sheetStyle : {}}
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-sheet-title"
            >
                <div ref={handleRef} className="py-3 cursor-grab active:cursor-grabbing flex-shrink-0">
                    <div className="w-10 h-1.5 bg-neutral-300 dark:bg-gray-600 rounded-full mx-auto" />
                </div>
                <div className="px-4 pb-4 border-b border-neutral-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <h2 id="history-sheet-title" className="text-lg font-semibold text-neutral-800 dark:text-gray-200">
                            Chat History
                        </h2>
                        <button
                            onClick={onNewChat}
                            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-sm"
                            aria-label="Start new chat"
                        >
                            <Plus className="h-4 w-4" />
                            New Chat
                        </button>
                    </div>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400 dark:text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-100 dark:bg-gray-800/60 border border-neutral-200 dark:border-gray-700 rounded-lg py-2 pl-10 pr-8 focus:outline-none focus:ring-1 focus:ring-amber-500 text-neutral-800 dark:text-gray-200"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-neutral-500 dark:text-gray-400 hover:bg-neutral-200 dark:hover:bg-gray-700"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div ref={scrollContainerRef} className="overflow-y-auto p-2 flex-1">
                    {filteredConversations.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500 dark:text-gray-400">
                            {searchQuery ? 'No results found.' : 'No conversations yet.'}
                        </div>
                    ) : (
                        <ul>
                            {filteredConversations.map((convo) => (
                                <li key={convo.id} className="group relative">
                                    {renamingId === convo.id ? (
                                        <div className="flex items-center w-full text-left p-2 my-1">
                                            <input
                                                ref={renameInputRef}
                                                value={renameValue}
                                                onChange={(e) => setRenameValue(e.target.value)}
                                                onBlur={handleFinishRename}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleFinishRename();
                                                    if (e.key === 'Escape') setRenamingId(null);
                                                }}
                                                className="w-full bg-neutral-100 dark:bg-gray-800/60 text-neutral-800 dark:text-gray-200 focus:outline-none ring-1 ring-amber-500 rounded p-1.5"
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onSelectConversation(convo.id)}
                                            className={`w-full text-left p-3 my-1 rounded-lg transition-colors flex items-center gap-3 ${
                                                convo.id === activeConversationId
                                                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                                                    : 'text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-800/60'
                                            }`}
                                        >
                                            {convo.isPinned && <Pin className="h-4 w-4 text-amber-500 dark:text-amber-400 transform -rotate-45 flex-shrink-0 mr-1" />}
                                            {convo.isGeneratingTitle ? (
                                                 <div className="w-3/4 h-4 bg-neutral-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
                                            ) : (
                                                 <span className="font-medium flex-1 break-words">{convo.title}</span>
                                            )}
                                        </button>
                                    )}

                                    {renamingId !== convo.id && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center transition-opacity">
                                            <button 
                                                onClick={(e) => handleToggleMenu(e, convo.id)}
                                                className="p-2 rounded-full text-neutral-500 dark:text-gray-400 hover:bg-neutral-200 dark:hover:bg-gray-700/70"
                                                aria-label="Conversation options"
                                            >
                                                <MoreVertical className="h-5 w-5" />
                                            </button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {menuConfig.id && menuConfig.rect && activeMenuConvo && (
                <div
                    ref={menuRef}
                    className="fixed z-50 w-40 bg-white dark:bg-[#2E2F33] border border-neutral-200 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden"
                    style={calculateMenuPosition(menuConfig.rect)}
                >
                    <button onClick={() => handleStartRename(activeMenuConvo)} className="w-full flex items-center gap-3 p-2.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors">
                        <Pencil className="w-4 h-4" /> Rename
                    </button>
                    <button onClick={() => { onPinConversation(activeMenuConvo.id); setMenuConfig({ id: null, rect: null }); }} className="w-full flex items-center gap-3 p-2.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-700/70 transition-colors">
                        <Pin className="w-4 h-4" /> {activeMenuConvo.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button onClick={() => { onDeleteConversation(activeMenuConvo.id); setMenuConfig({ id: null, rect: null }); }} className="w-full flex items-center gap-3 p-2.5 text-sm text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            )}
        </>
    );
};

export default ChatHistorySheet;