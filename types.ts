import React from 'react';

export type ChatModel = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.5-flash-lite' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';
export type Tool = 'smart' | 'webSearch' | 'thinking' | 'translator' | 'urlReader' | 'chemistry';
export type View = 'chat' | 'memory' | 'translator' | 'usage' | 'usage-detail' | 'convo-detail';

export type MessageRole = 'user' | 'model';

export interface ModelInfo {
  id: ChatModel;
  name: string;
  description: string;
}

export interface Web {
  uri: string;
  title: string;
}

export interface GroundingChunk {
  web: Web;
}

export interface ThoughtStep {
  phase: string;
  step: string;
  concise_step: string;
}

export interface MoleculeData {
    atoms: {
        element: string;
        x: number;
        y: number;
        z: number;
    }[];
    bonds: {
        from: number;
        to: number;
        order: number;
    }[];
    molecularFormula?: string;
    molecularWeight?: string;
    iupacName?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: string; // Added to track message creation time
  images?: {
      base64: string;
      mimeType: string;
  }[];
  file?: {
      base64: string;
      mimeType: string;
      name: string;
      size: number;
  };
  url?: string;
  modelUsed?: ChatModel;
  sources?: GroundingChunk[];
  thoughts?: ThoughtStep[];
  searchPlan?: ThoughtStep[];
  thinkingDuration?: number;
  isAnalyzingImage?: boolean;
  isAnalyzingFile?: boolean;
  analysisCompleted?: boolean;
  isPlanning?: boolean;
  toolInUse?: 'url';
  isLongToolUse?: boolean;
  memoryUpdated?: boolean;
  inputTokens?: number; // User prompt tokens
  outputTokens?: number; // Model response tokens
  // FIX: Add systemTokens to track tokens from system instructions, history, etc. This resolves an error in UsageStatsView.
  systemTokens?: number;
  generationTime?: number;
  isMoleculeRequest?: boolean;
  molecule?: MoleculeData;
}

export interface AppError {
    message: string;
}

export interface Suggestion {
  text: string;
  prompt: string;
  icon?: React.ReactNode;
}

export interface ConvoSummary {
  id: string;
  userMessageId: string;
  modelMessageId: string;
  serialNumber: number;
  userInput: string;
  summary: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  isPinned?: boolean;
  isGeneratingTitle?: boolean;
  summaries?: ConvoSummary[];
}

// User Profile for persistent user-specific info.
export interface UserProfile {
  name: string | null;
}

// Long-Term Memory: A global list of important facts.
export type LTM = string[];

export interface CodeSnippet {
  id: string;
  description: string;
  language: string;
  code: string;
}

export interface ConsoleLog {
  level: 'log' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

// Types for the Developer Console
export type ConsoleMode = 'auto' | 'manual';

export interface ConsoleLogEntry {
    id: string;
    timestamp: string;
    message: string;
    stack?: string;
}

// FIX: Add Location interface for the InteractiveMap component.
export interface Location {
    lat: number;
    lon: number;
    name?: string;
    details?: string;
}