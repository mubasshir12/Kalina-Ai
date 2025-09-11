import React from 'react';
import { Conversation, LTM, Suggestion, View, ChatMessage } from '../types';
import ChatHistory from './ChatHistory';
import WelcomeScreen from './WelcomeScreen';
import MemoryManagement from './MemoryManagement';
import TranslatorView from './Translator';
import UsageStatsView from './UsageStatsView';
import UsageDetailView from './UsageDetailView';
import ConvoDetailView from './ConvoDetailView';
import FullScreenEditor from './FullScreenEditor';
import ImageEditorView from './ImageEditorView';

interface ViewRendererProps {
    currentView: View;
    showWelcomeScreen: boolean;
    activeConversation: Conversation | undefined;
    conversations: Conversation[];
    isLoading: boolean;
    isThinking: boolean;
    isSearchingWeb: boolean;
    ltm: LTM;
    translatorUsage: { input: number; output: number };
    handleRetry: () => void;
    handleEditMessage: (index: number, newContent: string) => void;
    handleSelectSuggestion: (suggestion: Suggestion) => void;
    handleCancelStream: () => void;
    setCurrentView: (view: View) => void;
    setLtm: React.Dispatch<React.SetStateAction<LTM>>;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
    onCloseTranslator: () => void;
    onTranslationComplete: (tokens: { input: number; output: number }) => void;
    setModalImage: (url: string | null) => void;
    setCodeForPreview: (data: { code: string; language: string; } | null) => void;
    viewingUsageConvoId: string | null;
    onViewUsageDetails: (conversationId: string) => void;
    viewingConvo: { user: ChatMessage; model: ChatMessage; serialNumber: number } | null;
    onViewConvoDetails: (convoPair: { user: ChatMessage; model: ChatMessage; serialNumber: number }) => void;
    onSaveEditor: (newText: string) => void;
    editorInitialText: string;
    onSaveEditedImage: (newBase64: string) => void;
    imageToEdit: { index: number; base64: string; mimeType: string; } | null;
}

const ViewRenderer: React.FC<ViewRendererProps> = ({
    currentView,
    showWelcomeScreen,
    activeConversation,
    conversations,
    isLoading,
    isThinking,
    isSearchingWeb,
    ltm,
    translatorUsage,
    handleRetry,
    handleEditMessage,
    handleSelectSuggestion,
    handleCancelStream,
    setCurrentView,
    setLtm,
    scrollContainerRef,
    onCloseTranslator,
    onTranslationComplete,
    setModalImage,
    setCodeForPreview,
    viewingUsageConvoId,
    onViewUsageDetails,
    viewingConvo,
    onViewConvoDetails,
    onSaveEditor,
    editorInitialText,
    onSaveEditedImage,
    imageToEdit
}) => {

    switch (currentView) {
        case 'memory':
            return (
                <MemoryManagement
                    memory={ltm}
                    setMemory={setLtm}
                    onBack={() => setCurrentView('chat')}
                />
            );
        case 'translator':
            return <TranslatorView onBack={onCloseTranslator} onTranslationComplete={onTranslationComplete} />;
        case 'usage':
            return <UsageStatsView conversations={conversations} onBack={() => setCurrentView('chat')} translatorUsage={translatorUsage} onViewDetails={onViewUsageDetails} />;
        case 'usage-detail':
            const conversationForDetail = conversations.find(c => c.id === viewingUsageConvoId);
            return <UsageDetailView conversation={conversationForDetail} onBack={() => setCurrentView('usage')} onViewConvoDetails={onViewConvoDetails} />;
        case 'convo-detail':
            return <ConvoDetailView convoPair={viewingConvo} onBack={() => setCurrentView('usage-detail')} setCodeForPreview={setCodeForPreview} />;
        case 'editor':
            return <FullScreenEditor 
                        onBack={() => setCurrentView('chat')} 
                        onSave={onSaveEditor} 
                        initialText={editorInitialText} 
                    />;
        case 'image-editor':
            return imageToEdit ? (
                <ImageEditorView
                    onBack={() => setCurrentView('chat')}
                    onSave={onSaveEditedImage}
                    imageBase64={imageToEdit.base64}
                    mimeType={imageToEdit.mimeType}
                />
            ) : null;
        case 'chat':
        default:
            return (
                <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 relative">
                        <div 
                            ref={scrollContainerRef} 
                            className={`absolute inset-0 ${!showWelcomeScreen ? 'overflow-y-auto scrollbar-hide' : 'overflow-hidden'}`}
                        >
                           {showWelcomeScreen ? (
                                <WelcomeScreen onSelectSuggestion={handleSelectSuggestion} />
                            ) : (
                                <div className="px-2 pt-4 md:px-4 md:pt-6 pb-2">
                                    <div className="max-w-4xl mx-auto">
                                        {activeConversation && (
                                            <ChatHistory
                                                messages={activeConversation.messages}
                                                isLoading={isLoading}
                                                isThinking={isThinking}
                                                isSearchingWeb={isSearchingWeb}
                                                onRetry={handleRetry}
                                                onEditMessage={handleEditMessage}
                                                onCancelStream={handleCancelStream}
                                                scrollContainerRef={scrollContainerRef}
                                                setModalImage={setModalImage}
                                                setCodeForPreview={setCodeForPreview}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            );
    }
};

export default ViewRenderer;
