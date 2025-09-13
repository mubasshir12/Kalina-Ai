import React from 'react';

export type ChatModel = 'gemini-2.5-flash' | 'gemini-2.5-pro' | 'gemini-2.5-flash-lite' | 'gemini-2.0-flash' | 'gemini-2.0-flash-lite';
export type Tool = 'smart' | 'webSearch' | 'thinking' | 'translator' | 'urlReader' | 'chemistry';
export type View = 'chat' | 'memory' | 'translator' | 'usage' | 'usage-detail' | 'convo-detail' | 'editor' | 'image-editor' | 'storage' | 'molecule-viewer' | 'word-analysis';

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

// Fix: Add and export the 'Location' interface for use in the InteractiveMap component.
export interface Location {
    lat: number;
    lon: number;
    name?: string;
    details?: string;
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
  systemTokens?: number;
  generationTime?: number;
  isMoleculeRequest?: boolean;
  molecule?: MoleculeData;
  moleculeNameForAnimation?: string;
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

export interface PlannerContextItem {
  id: string;
  serialNumber: number;
  userSummary: string;
  aiSummary: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  isPinned?: boolean;
  isGeneratingTitle?: boolean;
  summaries?: ConvoSummary[];
  plannerContext?: PlannerContextItem[];
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
export type ConsoleMode = 'auto' | 'manual' | 'disabled';

export interface ConsoleLogEntry {
    id: string;
    timestamp: string;
    level: 'log' | 'warn' | 'error';
    message: string;
    stack?: string;
}

export interface TokenLog {
    id: string;
    timestamp: string;
    source: 'Chat' | 'Memory/Suggestions' | 'Translator' | 'Planner' | 'Code Analyzer' | 'Convo Summarizer';
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    details?: string;
}