import React from 'react';
import { Conversation, LTM, Suggestion, View, ChatMessage, MoleculeData, OrbitalData, GroundingChunk, Tool } from '../types';
import ChatHistory from './ChatHistory';
import WelcomeScreen from './WelcomeScreen';
import MemoryManagement from './MemoryManagement';
import TranslatorView from './Translator';
import UsageStatsView from './UsageStatsView';
import UsageDetailView from './UsageDetailView';
import ConvoDetailView from './ConvoDetailView';
import FullScreenEditor from './FullScreenEditor';
import ImageEditorView from './ImageEditorView';
import StorageManagement from './StorageManagement';
import MoleculeViewer from './MoleculeViewer';
import OrbitalViewer from './OrbitalViewer';
import WordAnalysisView from './WordAnalysisView';
import { ArrowLeft } from 'lucide-react';

const FullScreenMoleculeView: React.FC<{ molecule: MoleculeData; onBack: () => void; }> = ({ molecule, onBack }) => {
    return (
        <main className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-hidden h-full">
            <div className="flex items-center mb-6 flex-shrink-0">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-gray-800/50 transition-colors mr-2 md:mr-4" aria-label="Back to chat">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-gray-200">Molecule Viewer</h1>
            </div>
            <div className="flex-1 flex flex-col min-h-0 bg-neutral-200 dark:bg-gray-900 rounded-2xl overflow-hidden">
                <MoleculeViewer molecule={molecule} isFullScreen={true} />
            </div>
        </main>
    );
};

const FullScreenOrbitalView: React.FC<{ orbital: OrbitalData; onBack: () => void; }> = ({ orbital, onBack }) => {
    return (
        <main className="relative z-10 flex-1 flex flex-col p-4 md:p-6 overflow-hidden h-full">
            <div className="flex items-center mb-6 flex-shrink-0">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-neutral-200/50 dark:hover:bg-gray-800/50 transition-colors mr-2 md:mr-4" aria-label="Back to chat">
                    <ArrowLeft className="h-6 w-6" />
                </button>
                <h1 className="text-2xl md:text-3xl font-bold text-neutral-800 dark:text-gray-200">Orbital Viewer</h1>
            </div>
            <div className="flex-1 flex flex-col min-h-0 bg-neutral-200 dark:bg-gray-900 rounded-2xl overflow-hidden">
                <OrbitalViewer orbital={orbital} isFullScreen={true} />
            </div>
        </main>
    );
};

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
    onTryMultiAgent: () => void;
    ctaRef: React.Ref<HTMLButtonElement>;
    onSaveEditor: (newText: string) => void;
    editorInitialText: string;
    onSaveEditedImage: (newBase64: string) => void;
    imageToEdit: { index: number; base64: string; mimeType: string; } | null;
    isSelectionMode: boolean;
    selectedMessageIds: Set<string>;
    onToggleMessageSelection: (userMessageId: string) => void;
    moleculeForFullScreen: MoleculeData | null;
    onMaximizeMoleculeViewer: (molecule: MoleculeData) => void;
    orbitalForFullScreen: OrbitalData | null;
    onMaximizeOrbitalViewer: (orbital: OrbitalData) => void;
    onViewSources: (sources: GroundingChunk[]) => void;
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
    onTryMultiAgent,
    ctaRef,
    onSaveEditor,
    editorInitialText,
    onSaveEditedImage,
    imageToEdit,
    isSelectionMode,
    selectedMessageIds,
    onToggleMessageSelection,
    moleculeForFullScreen,
    onMaximizeMoleculeViewer,
    orbitalForFullScreen,
    onMaximizeOrbitalViewer,
    onViewSources,
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
        case 'storage':
            return <StorageManagement onBack={() => setCurrentView('chat')} />;
        case 'molecule-viewer':
            return moleculeForFullScreen ? (
                <FullScreenMoleculeView 
                    molecule={moleculeForFullScreen}
                    onBack={() => setCurrentView('chat')}
                />
            ) : null;
        case 'orbital-viewer':
            return orbitalForFullScreen ? (
                <FullScreenOrbitalView 
                    orbital={orbitalForFullScreen}
                    onBack={() => setCurrentView('chat')}
                />
            ) : null;
        case 'word-analysis':
            return <WordAnalysisView onBack={() => setCurrentView('chat')} />;
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
                                <WelcomeScreen onSelectSuggestion={handleSelectSuggestion} onTryMultiAgent={onTryMultiAgent} ctaRef={ctaRef} />
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
                                                isSelectionMode={isSelectionMode}
                                                selectedMessageIds={selectedMessageIds}
                                                onToggleMessageSelection={onToggleMessageSelection}
                                                onMaximizeMoleculeViewer={onMaximizeMoleculeViewer}
                                                onMaximizeOrbitalViewer={onMaximizeOrbitalViewer}
                                                onViewSources={onViewSources}
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