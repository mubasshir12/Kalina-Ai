import React, { useState, useRef, useCallback } from 'react';
import { Content, Part } from '@google/ai-sdk/ai';
import { ChatMessage as ChatMessageType, Suggestion, ChatModel, LTM, CodeSnippet, GroundingChunk, UserProfile, Tool, Conversation } from '../types';
import { getAiClient } from '../services/aiClient';
import { startChatSession, buildSystemInstruction } from '../services/chatService';
import { planResponse } from '../services/geminiService';
import { updateMemory, generateConvoSummaries } from '../services/memoryService';
import { processAndSaveCode, findRelevantCode } from '../services/codeService';
import * as urlReaderService from '../services/urlReaderService';
import { getMoleculeData } from '../services/chemistryService';
import { getFriendlyErrorMessage } from '../utils/errorUtils';
import { useDebug } from '../contexts/DebugContext';
import { developerProfile } from '../services/developerProfile';
import { getPersonaContext } from '../services/personaService';
import { getCapabilitiesContext } from '../services/capabilitiesService';

const models = [
    { id: 'gemini-2.5-flash', name: 'Kalina 2.5 Flash' },
    { id: 'gemini-2.5-pro', name: 'Kalina 2.5 Pro' },
    { id: 'gemini-2.5-flash-lite', name: 'Kalina 2.5 Flash Lite' },
    { id: 'gemini-2.0-flash', name: 'Kalina 2.0 Flash' },
    { id: 'gemini-2.0-flash-lite', name: 'Kalina 2.0 Flash Lite' },
];

const transformMessagesToHistory = (msgs: ChatMessageType[]): Content[] => {
      const validMessages = msgs.filter(m => !(m.role === 'model' && !m.content?.trim() && !m.images));
      return validMessages.map(msg => {
          const parts: Part[] = [];
          if (msg.content) {
              parts.push({ text: msg.content });
          }
          if (msg.images) {
              msg.images.forEach(image => {
                  parts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } });
              });
          }
          if (msg.file) {
              parts.push({ inlineData: { data: msg.file.base64, mimeType: msg.file.mimeType } });
          }
          return {
              role: msg.role,
              parts: parts,
          };
      }).filter(msg => msg.parts.length > 0);
  };
  
// Simple estimation: ~4 characters per token.
const estimateTokens = (text: string): number => {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
};

export const useChatHandler = ({
    apiKey,
    conversations,
    activeConversationId,
    ltm,
    codeMemory,
    userProfile,
    selectedTool,
    selectedChatModel,
    updateConversation,
    updateConversationMessages,
    setConversations,
    setActiveConversationId,
    setLtm,
    setCodeMemory,
    setUserProfile,
    setActiveSuggestion
}) => {
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isThinking, setIsThinking] = useState<boolean>(false);
    const [isSearchingWeb, setIsSearchingWeb] = useState<boolean>(false);
    const [isLongToolUse, setIsLongToolUse] = useState<boolean>(false);
    const [error, setError] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    const thinkingIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const thinkingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const thinkingTimeRef = useRef(0);
    const isCancelledRef = useRef(false);
    const responseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const responseStartTimeRef = useRef(0);
    const { logError } = useDebug();


    const clearThinkingIntervals = useCallback(() => {
        if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
        if (thinkingTimerRef.current) clearInterval(thinkingTimerRef.current);
        thinkingIntervalRef.current = null;
        thinkingTimerRef.current = null;
        setIsThinking(false);
    }, []);
    
    const stopResponseTimer = useCallback(() => {
        if (responseTimerRef.current) {
            clearInterval(responseTimerRef.current);
            responseTimerRef.current = null;
        }
        setElapsedTime(0);
    }, []);

    const handleCancelStream = useCallback(() => {
        isCancelledRef.current = true;

        // Stop all state-based animations and timers immediately.
        clearThinkingIntervals();
        stopResponseTimer();
        setIsLoading(false);
        setIsSearchingWeb(false);
        setIsLongToolUse(false);

        // Update the message-based animations and add the stop message immediately.
        if (activeConversationId) {
            updateConversationMessages(activeConversationId, prev => {
                // Create a clean copy of messages, stripping all transient animation flags.
                const cleanedMessages = prev.map(m => {
                    const {
                        isAnalyzingImage,
                        isAnalyzingFile,
                        isPlanning,
                        toolInUse,
                        isLongToolUse,
                        thoughts,
                        searchPlan,
                        ...rest
                    } = m;
                    return rest;
                });

                const lastMessageIndex = cleanedMessages.length - 1;
                const lastMessage = cleanedMessages[lastMessageIndex];

                if (lastMessage?.role === 'model') {
                    const newContent = lastMessage.content?.trim()
                        ? lastMessage.content.trim() + '\n\n*Response generation stopped.*'
                        : '*Response generation stopped.*';

                    cleanedMessages[lastMessageIndex] = { ...lastMessage, content: newContent };
                } else {
                    cleanedMessages.push({
                        id: crypto.randomUUID(),
                        role: 'model',
                        content: '*Response generation stopped.*',
                        timestamp: new Date().toISOString(),
                    });
                }

                return cleanedMessages;
            });
        }
    }, [activeConversationId, updateConversationMessages, clearThinkingIntervals, stopResponseTimer]);

    const handleSendMessage = useCallback(async (prompt: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; size: number; }, url?: string, overrideModel?: ChatModel, isRetry = false) => {
        const fullPrompt = prompt;
        if ((!fullPrompt.trim() && !images && !file && !url) || isLoading || !apiKey) return;

        const modelToUse = overrideModel || selectedChatModel;

        let currentConversationId = activeConversationId;
        let isFirstTurnInConversation = false;
        let conversationForThisTurn: Conversation;

        if (!currentConversationId) {
            const newId = crypto.randomUUID();
            // FIX: Add the required 'createdAt' property when creating a new conversation to conform to the Conversation type.
            conversationForThisTurn = { id: newId, title: "New Chat", messages: [], createdAt: new Date().toISOString(), summaries: [] };
            setConversations(prev => [conversationForThisTurn, ...prev]);
            setActiveConversationId(newId);
            currentConversationId = newId;
            isFirstTurnInConversation = true;
        } else {
            const foundConvo = conversations.find(c => c.id === currentConversationId);
            if (!foundConvo) {
                logError(new Error(`useChatHandler: Could not find active conversation with ID ${currentConversationId}`));
                setIsLoading(false);
                stopResponseTimer();
                return;
            }
            conversationForThisTurn = foundConvo;
            isFirstTurnInConversation = conversationForThisTurn.messages.length === 0;
        }

        setError(null);
        setIsLoading(true);
        isCancelledRef.current = false;
        
        responseStartTimeRef.current = Date.now();
        setElapsedTime(0);
        responseTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - responseStartTimeRef.current;
            setElapsedTime(elapsed);
        }, 53);

        const planningMessage: ChatMessageType = { id: crypto.randomUUID(), role: 'model', content: '', isPlanning: true, modelUsed: modelToUse, timestamp: new Date().toISOString() };
        
        if (!isRetry) {
            const newUserMessage: ChatMessageType = { id: crypto.randomUUID(), role: 'user', content: fullPrompt, images: images, file: file, url: url, modelUsed: modelToUse, timestamp: new Date().toISOString() };
            updateConversationMessages(currentConversationId, prev => [...prev, newUserMessage, planningMessage]);
        } else {
            updateConversationMessages(currentConversationId, prev => [...prev, planningMessage]);
        }

        let longToolUseTimer: ReturnType<typeof setTimeout> | null = null;
        let isImageAnalysisRequest = false;
        let isFileAnalysisRequest = false;

        try {
            const plan = await planResponse(fullPrompt, images, file, modelToUse);
            if (isCancelledRef.current) return;
            
            let developerContext: string | undefined = undefined;
            let personaContext: string | undefined = undefined;
            let capabilitiesContext: string | undefined = undefined;

            personaContext = getPersonaContext();

            if (plan.isCreatorRequest) {
                developerContext = `My developer is ${developerProfile.name}. He is a ${developerProfile.age}-year-old from ${developerProfile.location}, and ${developerProfile.role} of ${developerProfile.appName}.`;
            }

            if (plan.isCapabilitiesRequest) {
                capabilitiesContext = getCapabilitiesContext();
            }

            let isThinkingEnabled = plan.needsThinking;
            let isWebSearchEnabled = plan.needsWebSearch;
            let finalPromptForModel = fullPrompt;

            // Manual tool selection overrides the planner
            const toolOverrides: Partial<Record<Tool, () => void>> = {
                'urlReader': () => { plan.isUrlReadRequest = true; isWebSearchEnabled = false; isThinkingEnabled = false; isImageAnalysisRequest = false; },
                'thinking': () => { isThinkingEnabled = true; isWebSearchEnabled = false; plan.isUrlReadRequest = false; },
                'webSearch': () => { isWebSearchEnabled = true; isThinkingEnabled = false; plan.isUrlReadRequest = false; isImageAnalysisRequest = false; },
                'chemistry': () => { plan.isMoleculeRequest = true; isWebSearchEnabled = false; isThinkingEnabled = false; },
            };
            
            if (toolOverrides[selectedTool]) {
                toolOverrides[selectedTool]!();
            }
            
            isImageAnalysisRequest = !!images && images.length > 0;
            isFileAnalysisRequest = !!file;

            let toolInUse: ChatMessageType['toolInUse'] = undefined;

            if (isImageAnalysisRequest) {
                isThinkingEnabled = false;
                plan.thoughts = [];
                // Start animation on the user's message
                updateConversationMessages(currentConversationId, prev =>
                    prev.map(m => m.id === prev[prev.length - 2]?.id ? { ...m, isAnalyzingImage: true } : m)
                );
            }

            if (isFileAnalysisRequest) {
                updateConversationMessages(currentConversationId, prev =>
                    prev.map(m => m.id === prev[prev.length - 2]?.id ? { ...m, isAnalyzingFile: true } : m)
                );
            }
            
            const handleToolError = (errorMessage: string) => {
                if (longToolUseTimer) clearTimeout(longToolUseTimer);
                setIsLongToolUse(false);
                updateConversationMessages(currentConversationId, prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    newMessages[newMessages.length - 1] = { ...lastMsg, toolInUse: undefined, isPlanning: false, content: `Sorry, I couldn't use that tool. Error: ${errorMessage}` };
                    return newMessages;
                });
                setIsLoading(false);
                stopResponseTimer();
            };
            
            longToolUseTimer = setTimeout(() => {
                setIsLongToolUse(true);
                updateConversationMessages(currentConversationId, prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === 'model') {
                        updated[updated.length - 1] = { ...last, isLongToolUse: true };
                    }
                    return updated;
                });
            }, 20000); // 20 seconds for any tool

            if (plan.isUrlReadRequest) {
                toolInUse = 'url';
                if (!url) {
                    return handleToolError("No valid URL was provided for the URL Reader tool.");
                }
                updateConversationMessages(currentConversationId, prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, isPlanning: false, toolInUse } : m));
                try {
                    const cleanedContent = await urlReaderService.fetchAndParseUrlContent(url);
                     if (isCancelledRef.current) return;
                    finalPromptForModel = `[URL: ${url}]\n\n[EXTRACTED WEBPAGE CONTENT]:\n${cleanedContent}\n\n[USER QUESTION]:\n${fullPrompt}`;
                } catch (urlError: any) {
                    return handleToolError(urlError.message);
                }
            }

            if (plan.isMoleculeRequest) {
                const moleculeName = plan.moleculeName || fullPrompt;
                updateConversationMessages(currentConversationId, prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, isPlanning: false, isMoleculeRequest: true } : m));
                
                try {
                    const moleculeData = await getMoleculeData(moleculeName);
                    if (isCancelledRef.current) return;
                    
                    updateConversationMessages(currentConversationId, prev => {
                         const newMessages = [...prev];
                         newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], isMoleculeRequest: false, molecule: moleculeData };
                         return newMessages;
                    });
                    
                    finalPromptForModel = `I have successfully found and displayed the 3D model and key properties for ${moleculeName}. Now, please provide a brief, helpful description focusing on its common uses or significance.`;
                    isWebSearchEnabled = false;
                    isThinkingEnabled = false;

                } catch (chemError: any) {
                    logError(chemError);
                    updateConversationMessages(currentConversationId, prev => {
                         const newMessages = [...prev];
                         const lastMsg = newMessages[newMessages.length - 1];
                         newMessages[newMessages.length - 1] = { ...lastMsg, isMoleculeRequest: false, isPlanning: false, content: `Sorry, I couldn't find a 3D model for "${moleculeName}". Please check the spelling or try a different compound.` };
                         return newMessages;
                    });
                    setIsLoading(false);
                    stopResponseTimer();
                    return;
                }
            }


            updateConversationMessages(currentConversationId, prev => {
                const newMessages = [...prev];
                if (newMessages[newMessages.length - 1]?.isPlanning || newMessages[newMessages.length - 1]?.toolInUse) {
                    newMessages[newMessages.length - 1] = { ...newMessages[newMessages.length - 1], isPlanning: false, toolInUse: undefined, thoughts: plan.thoughts };
                }
                return newMessages;
            });
            
            if (isThinkingEnabled && plan.thoughts.length > 0) {
                setIsThinking(true);
                thinkingTimeRef.current = 0;
                thinkingTimerRef.current = setInterval(() => {
                    thinkingTimeRef.current += 0.1;
                    updateConversationMessages(currentConversationId, prev => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.role === 'model') {
                            updated[updated.length-1] = {...last, thinkingDuration: thinkingTimeRef.current };
                        }
                        return updated;
                    });
                }, 100);
            }

            if (isWebSearchEnabled) {
                setIsSearchingWeb(true);
                if (plan.searchPlan && plan.searchPlan.length > 0) {
                     updateConversationMessages(currentConversationId, prev => {
                        const updated = [...prev];
                        const last = updated[updated.length - 1];
                        if (last?.role === 'model') {
                            updated[updated.length - 1] = { ...last, searchPlan: plan.searchPlan };
                        }
                        return updated;
                    });
                }
            }

            const historyMessages = conversationForThisTurn.messages;
            const summaries = conversationForThisTurn.summaries;

            let retrievedCodeSnippets: CodeSnippet[] = [];
            if (plan.needsCodeContext && codeMemory.length > 0) {
                const codeDescriptions = codeMemory.map(({ id, description }) => ({ id, description }));
                const relevantIds = await findRelevantCode(fullPrompt, codeDescriptions);
                 if (isCancelledRef.current) return;
                retrievedCodeSnippets = codeMemory.filter(snippet => relevantIds.includes(snippet.id));
            }

            const modelName = models.find(m => m.id === modelToUse)?.name || 'Kalina AI';
            let stream;

            const userMessageParts: Part[] = [];
            if (images) { images.forEach(image => userMessageParts.push({ inlineData: { data: image.base64, mimeType: image.mimeType } })); }
            if (file) { userMessageParts.push({ inlineData: { data: file.base64, mimeType: file.mimeType } }); }
            if (finalPromptForModel) { userMessageParts.push({ text: finalPromptForModel }); }
            if (userMessageParts.length === 0) throw new Error("Cannot send an empty message.");

            if (isWebSearchEnabled) {
                const ai = getAiClient();
                const systemInstruction = buildSystemInstruction(
                    isFirstTurnInConversation, modelName, ltm, userProfile, summaries, retrievedCodeSnippets, developerContext, personaContext, capabilitiesContext
                );
                const history = transformMessagesToHistory(historyMessages);
                const contents = [...history, { role: 'user', parts: userMessageParts }];

                stream = await ai.models.generateContentStream({
                    model: modelToUse,
                    contents: contents,
                    config: {
                        systemInstruction: systemInstruction,
                        tools: [{ googleSearch: {} }],
                    }
                });
            } else {
                const chat = startChatSession(
                    modelToUse, isThinkingEnabled, modelName, ltm, userProfile, isFirstTurnInConversation, 
                    transformMessagesToHistory(historyMessages), summaries, retrievedCodeSnippets, developerContext, personaContext, capabilitiesContext
                );
                // FIX: The `sendMessageStream` method expects an object with a `message` property, not a direct array of parts.
                stream = await chat.sendMessageStream({ message: userMessageParts });
            }
            
            // As soon as the stream starts, clear pre-computation states.
            if (longToolUseTimer) {
                clearTimeout(longToolUseTimer);
                setIsLongToolUse(false);
            }
            if (isThinkingEnabled) clearThinkingIntervals();
            if (isWebSearchEnabled) setIsSearchingWeb(false);
            if (isImageAnalysisRequest) {
                updateConversationMessages(currentConversationId, prev =>
                    prev.map(m => (m.role === 'user' && m.isAnalyzingImage) ? { ...m, isAnalyzingImage: false, analysisCompleted: true } : m)
                );
            }
            if (isFileAnalysisRequest) {
                updateConversationMessages(currentConversationId, prev => prev.map(m => m.isAnalyzingFile ? { ...m, isAnalyzingFile: false } : m));
            }

            let finalModelResponse = '';
            let titleExtracted = false;
            let usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number; } | undefined = undefined;

            for await (const chunk of stream) {
                if (isCancelledRef.current) {
                    break;
                }

                if (chunk.usageMetadata) usageMetadata = chunk.usageMetadata;
                finalModelResponse += chunk.text;
                
                let displayContent = finalModelResponse;
                if (isFirstTurnInConversation) {
                    if (!titleExtracted) {
                        const titleMatch = displayContent.match(/^\s*TITLE:\s*([^\n]+)/);
                        if (titleMatch && titleMatch[1]) {
                            const currentTitle = titleMatch[1].trim();
                            updateConversation(currentConversationId, c => ({ ...c, title: currentTitle, isGeneratingTitle: false }));

                            if (displayContent.includes('\n')) {
                                titleExtracted = true;
                            }
                        } else if (displayContent.length > 50 && !displayContent.startsWith('TITLE:')) {
                            updateConversation(currentConversationId, c => ({ ...c, isGeneratingTitle: false }));
                            titleExtracted = true;
                        }
                    }
                    
                    displayContent = displayContent.replace(/^\s*TITLE:\s*[^\n]*\n?/, '');
                }

                const sources: GroundingChunk[] | undefined = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c: any) => c);

                updateConversationMessages(currentConversationId, prevMessages => {
                    const lastMessage = prevMessages[prevMessages.length - 1];
                    if (lastMessage?.role === 'model') {
                        const updatedMessages = [...prevMessages];
                        updatedMessages[prevMessages.length - 1] = { ...lastMessage, content: displayContent, sources, isPlanning: false };
                        return updatedMessages;
                    }
                    // This case handles adding the very first model message chunk
                    return [...prevMessages, { id: crypto.randomUUID(), role: 'model', content: displayContent, sources, timestamp: new Date().toISOString() }];
                });
            }

            if (usageMetadata && !isCancelledRef.current) {
                updateConversationMessages(currentConversationId, prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'model') {
                        const totalPromptTokens = usageMetadata.promptTokenCount || 0;
                        const outputTokens = usageMetadata.candidatesTokenCount;
                        const userTextTokens = estimateTokens(fullPrompt);

                        // If a tool that adds significant content to the prompt was used (image, url, search), show the total prompt tokens to reflect the tool's cost.
                        // Otherwise (for normal chat or creator requests), only show the user's text tokens to hide history/system prompt cost.
                        const toolUsed = toolInUse || isImageAnalysisRequest || isFileAnalysisRequest || isWebSearchEnabled;
                        const displayInputTokens = toolUsed ? totalPromptTokens : userTextTokens;
                        const systemTokens = toolUsed ? 0 : totalPromptTokens - userTextTokens;

                        return [...prev.slice(0, -1), { 
                            ...lastMessage, 
                            inputTokens: displayInputTokens, 
                            outputTokens: outputTokens,
                            systemTokens: systemTokens > 0 ? systemTokens : undefined,
                        }];
                    }
                    return prev;
                });
            }

            const finalCleanedResponse = finalModelResponse.replace(/^\s*TITLE:\s*[^\n]*\n?/, '');
            const finalConversationState = conversations.find(c => c.id === currentConversationId);
            if (finalConversationState && !isCancelledRef.current) {
                 // New 'convo' summarization logic
                if (finalConversationState.messages.length > 0 && finalConversationState.messages.length % 20 === 0) {
                    const convosToSummarize = [];
                    const recentMessages = finalConversationState.messages.slice(-20);
                    for (let i = 0; i < recentMessages.length; i += 2) {
                        if (recentMessages[i].role === 'user' && recentMessages[i+1]?.role === 'model') {
                            convosToSummarize.push({ user: recentMessages[i], model: recentMessages[i+1] });
                        }
                    }
                    if (convosToSummarize.length > 0) {
                        generateConvoSummaries(convosToSummarize, finalConversationState.summaries?.length || 0)
                            .then(newSummaries => {
                                updateConversation(currentConversationId, c => ({
                                    ...c,
                                    summaries: [...(c.summaries || []), ...newSummaries]
                                }));
                            });
                    }
                }

                const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
                let match;
                const codeContextForSaving = transformMessagesToHistory(finalConversationState.messages.slice(-2));
                while ((match = codeBlockRegex.exec(finalCleanedResponse)) !== null) {
                    const capturedMatch = match;
                    processAndSaveCode({ language: capturedMatch[1] || 'text', code: capturedMatch[2] }, codeContextForSaving)
                        .then(result => setCodeMemory(prev => [...prev, { id: crypto.randomUUID(), ...result, language: capturedMatch[1] || 'text', code: capturedMatch[2] }]));
                }

                if (finalCleanedResponse.trim()) {
                    updateMemory([{ role: 'user', parts: [{ text: fullPrompt }] }, { role: 'model', parts: [{ text: finalCleanedResponse }] }], ltm, userProfile, modelToUse)
                        .then(memoryResult => {
                            const { newMemories, updatedMemories, userProfileUpdates } = memoryResult;
                            
                            let ltmAfterUpdates = [...ltm];
                            let memoryWasModified = false;

                            // Process updates
                            if (updatedMemories && updatedMemories.length > 0) {
                                updatedMemories.forEach(update => {
                                    const index = ltmAfterUpdates.findIndex(mem => mem === update.old_memory);
                                    if (index !== -1) {
                                        ltmAfterUpdates[index] = update.new_memory;
                                        memoryWasModified = true;
                                    }
                                });
                            }

                            // Process additions
                            if (newMemories && newMemories.length > 0) {
                                const uniqueNewMemories = newMemories.filter(mem => !ltmAfterUpdates.includes(mem));
                                if (uniqueNewMemories.length > 0) {
                                    ltmAfterUpdates.push(...uniqueNewMemories);
                                    memoryWasModified = true;
                                }
                            }
                            
                            if (memoryWasModified) {
                                setLtm(ltmAfterUpdates);
                                updateConversationMessages(currentConversationId, prev => {
                                    const last = prev[prev.length - 1];
                                    return last?.role === 'model' ? [...prev.slice(0, -1), { ...last, memoryUpdated: true }] : prev;
                                });
                            }
                            
                            // Update user profile
                            if (userProfileUpdates.name && userProfileUpdates.name !== userProfile.name) {
                                setUserProfile(prev => ({ ...prev, name: userProfileUpdates.name }));
                            }
                        });
                }
            }
        } catch (e: any) {
            if (isCancelledRef.current) return;
            logError(e);
            const friendlyError = getFriendlyErrorMessage(e);
            setError(friendlyError);
            updateConversationMessages(currentConversationId, prev => {
                if (prev.length === 0) return prev;
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === 'user') {
                    newMessages.push({ id: crypto.randomUUID(), role: 'model', content: `Sorry, I encountered an error: ${friendlyError.message}`, timestamp: new Date().toISOString() });
                } else {
                     newMessages[newMessages.length - 1] = { ...lastMessage, isPlanning: false, toolInUse: undefined, content: `Sorry, I encountered an error: ${friendlyError.message}` };
                }
                return newMessages;
            });
        } finally {
            if (longToolUseTimer) clearTimeout(longToolUseTimer);

            // This conditional prevents this block from overwriting the immediate update from handleCancelStream.
            if (!isCancelledRef.current) {
                const finalElapsedTime = Date.now() - responseStartTimeRef.current;

                // Robustly clear any lingering analysis flags on normal completion
                if (currentConversationId) {
                    updateConversationMessages(currentConversationId, prev =>
                        prev.map(m => {
                            const { isAnalyzingImage, isAnalyzingFile, ...rest } = m;
                            return m.analysisCompleted ? { ...rest, analysisCompleted: true } : rest;
                        })
                    );
                }
                
                if (currentConversationId) {
                    updateConversationMessages(currentConversationId, prev => {
                        const lastMessage = prev[prev.length - 1];
                        if (lastMessage && lastMessage.role === 'model') {
                            const isError = lastMessage.content?.startsWith("Sorry, I encountered an error:");
                            if (!isError) {
                                return [...prev.slice(0, -1), { ...lastMessage, generationTime: finalElapsedTime }];
                            }
                        }
                        return prev;
                    });
                }
            }

            // These run for both cancelled and completed states.
            stopResponseTimer();
            setIsLoading(false);
            clearThinkingIntervals();
            setIsSearchingWeb(false);
            setIsLongToolUse(false);
            setActiveSuggestion(null);
            isCancelledRef.current = false; // Reset for next message
        }
    }, [
        apiKey, isLoading, activeConversationId, conversations, selectedChatModel, selectedTool, ltm, codeMemory, userProfile,
        setConversations, setActiveConversationId, setError, setIsLoading, updateConversationMessages, 
        updateConversation, setCodeMemory, setLtm, setUserProfile, setActiveSuggestion, clearThinkingIntervals, stopResponseTimer, logError
    ]);

    const handleUpdateMessageContent = (messageId: string, newContent: string) => {
        if (!activeConversationId) return;
        updateConversationMessages(activeConversationId, prev => 
            prev.map(msg => 
                msg.id === messageId ? { ...msg, content: newContent } : msg
            )
        );
    };

    return {
        isLoading,
        isThinking,
        isSearchingWeb,
        error,
        elapsedTime,
        setError,
        setIsLoading,
        setIsThinking,
        setIsSearchingWeb,
        clearThinkingIntervals,
        handleSendMessage,
        handleUpdateMessageContent,
        handleCancelStream,
    };
};