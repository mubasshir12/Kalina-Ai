import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';
import UserMessage from './message/UserMessage';
import ModelMessage from './message/ModelMessage';

interface ChatMessageProps extends ChatMessageType {
  isStreaming?: boolean;
  isThinking?: boolean;
  isSearchingWeb?: boolean;
  onRetry?: () => void;
  index: number;
  onEditMessage?: (index: number, newContent: string) => void;
  onUpdateMessageContent: (messageId: string, newContent: string) => void;
  onCancelStream?: () => void;
  setModalImage: (url: string | null) => void;
  setCodeForPreview: (data: { code: string; language: string; } | null) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = (props) => {
  const isUser = props.role === 'user';

  return (
    <>
      {isUser ? (
        <UserMessage {...props} />
      ) : (
        <ModelMessage {...props} />
      )}
    </>
  );
};

export default ChatMessage;