import React from 'react';
import { ChatMessage as ChatMessageType, MoleculeData, OrbitalData } from '../../types';
import MessageContent from './MessageContent';
import MessageToolbar from './MessageToolbar';
import MessageMetadata from './MessageMetadata';

interface ModelMessageProps extends ChatMessageType {
    setModalImage: (url: string | null) => void;
    isStreaming?: boolean;
    isThinking?: boolean;
    isSearchingWeb?: boolean;
    onRetry?: () => void;
    index: number;
    setCodeForPreview: (data: { code: string; language: string; } | null) => void;
    isSelectionMode?: boolean;
    onMaximizeMoleculeViewer: (molecule: MoleculeData) => void;
    onMaximizeOrbitalViewer: (orbital: OrbitalData) => void;
    onViewSources?: () => void;
}

const ModelMessage: React.FC<ModelMessageProps> = (props) => {
    const showToolbar = !props.isStreaming && props.content && !props.isSelectionMode;
    const showMetadata = !props.isStreaming && (props.modelUsed || typeof props.inputTokens === 'number' || typeof props.outputTokens === 'number' || (props.generationTime && props.generationTime > 0));

    return (
        <div id={`message-${props.index}`} className="w-full">
            <MessageContent {...props} />
            {showToolbar && <MessageToolbar {...props} />}
            {showMetadata && <MessageMetadata {...props} />}
        </div>
    );
};

export default ModelMessage;