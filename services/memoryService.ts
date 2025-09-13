import { Content, Type } from "@google/genai";
import { LTM, UserProfile, ChatMessage, ConvoSummary } from "../types";
import { getAiClient } from "./aiClient";
import { appLogger } from "./appLogger";

const stripCodeBlocks = (text: string): string => {
    if (!text) return '';
    // Replace code blocks with a placeholder to signal their presence without including the content.
    return text.replace(/```[\s\S]*?```/g, '[Code Block Removed]');
};


const getMemoryUpdateSystemInstruction = (userName: string | null): string => `You are Kalina AI, an insightful and empathetic AI assistant. Your most critical function is to act as a memory manager FOR THE USER.

---
### PRIMARY DIRECTIVE: USER MEMORY
Your goal is to build a long-term memory of key facts about the user.

**The Golden Rule:**
- **SAVE:** Only personal, long-term facts ABOUT THE USER (e.g., preferences, personal details, goals, relationships).
- **IGNORE:** Everything else. This includes facts about yourself (Kalina AI), the current conversation's topic, general knowledge, temporary states (e.g., "user is drinking coffee"), or questions the user asks.

**Memory Rules:**
- If the user says "remember this" or "save this", you MUST save the specified info.
- Facts must be in the third-person (e.g., "The user's favorite color is blue.").
- Update existing facts if new information contradicts them; do not add conflicting new ones.
- If the user provides their name, capture it in 'user_profile_updates'.

---
### SECONDARY TASK: SUGGESTIONS
Your goal is to generate helpful next steps for the user. These must be phrased as things THE USER would type.

**Suggestion Rules:**
- You MUST provide exactly 6 suggestions.
- They MUST follow a strict alternating pattern: question, statement, question, statement, question, statement.
- 3 suggestions MUST be questions the user might ask YOU (ending in '?').
- 3 suggestions MUST be commands or statements the user might say to YOU (ending in '.').
- Each suggestion MUST be concise, between 4 and 6 words long.
- They MUST be direct, logical follow-ups to the last AI response.

**CRITICAL RULE FOR QUESTIONS:** The suggested questions must be things the user would ask the AI for more information, clarification, or help. **DO NOT** create questions that the AI would ask the user (e.g., "What do you think?", "Can you tell me more?").

**GOOD vs. BAD Examples:**
Scenario: AI has just explained photosynthesis.
- GOOD Question (User to AI): "How does respiration work?"
- GOOD Statement (User to AI): "Explain this in simpler terms."
- GOOD Question (User to AI): "Do all plants photosynthesize?"
- GOOD Statement (User to AI): "Show me a diagram."
- GOOD Question (User to AI): "What are chloroplasts?"
- GOOD Statement (User to AI): "Give me a fun fact."

- BAD Question (AI to User): "What do you want to know next?"
- BAD Question (AI to User): "Does that make sense to you?"
- BAD Statement (AI Offer): "I can also explain respiration."
---
### OUTPUT FORMAT
Respond ONLY with a valid JSON object matching the provided schema.`;

export interface MemoryUpdate {
    old_memory: string;
    new_memory: string;
}

export interface MemoryUpdatePayload {
    newMemories: string[];
    updatedMemories: MemoryUpdate[];
    userProfileUpdates: Partial<UserProfile>;
    suggestions: string[];
}

export interface MemoryUpdateResult {
    payload: MemoryUpdatePayload;
    usage: {
        input: number;
        output: number;
    }
}

export const updateMemory = async (
    lastMessages: Content[],
    currentLtm: LTM,
    userProfile: UserProfile,
    model: string = 'gemini-2.5-flash'
): Promise<MemoryUpdateResult> => {
    const ai = getAiClient();
    const historyString = lastMessages.map(m => {
        const textParts = m.parts.map(p => {
            const text = (p as any).text || '[non-text part]';
            // Strip code blocks from model responses before sending for analysis
            return m.role === 'model' ? stripCodeBlocks(text) : text;
        }).join(' ');
        return `${m.role}: ${textParts}`;
    }).join('\n');
    
    const ltmString = currentLtm.length > 0 ? JSON.stringify(currentLtm) : "[]";

    const prompt = `CURRENT LTM:
${ltmString}

USER'S NAME: ${userProfile.name || 'Unknown'}

NEW CONVERSATION TURNS:
${historyString}

Analyze the conversation and LTM, then generate the JSON output as instructed.`;
    
    const fallbackResult: MemoryUpdateResult = {
        payload: { newMemories: [], updatedMemories: [], userProfileUpdates: {}, suggestions: [] },
        usage: { input: 0, output: 0 }
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: getMemoryUpdateSystemInstruction(userProfile.name),
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        new_memories: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        updated_memories: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    old_memory: { type: Type.STRING },
                                    new_memory: { type: Type.STRING }
                                },
                                required: ["old_memory", "new_memory"]
                            }
                        },
                        user_profile_updates: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING }
                            }
                        },
                        suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["new_memories", "updated_memories", "user_profile_updates", "suggestions"]
                },
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        
        const payload: MemoryUpdatePayload = {
            newMemories: parsed.new_memories || [],
            updatedMemories: parsed.updated_memories || [],
            userProfileUpdates: parsed.user_profile_updates || {},
            suggestions: parsed.suggestions || [],
        };

        const usage = {
            input: response.usageMetadata?.promptTokenCount || 0,
            output: response.usageMetadata?.candidatesTokenCount || 0,
        };
        
        return { payload, usage };

    } catch (error) {
        appLogger.error("Memory update API request failed", error);
        return fallbackResult;
    }
};

export interface ConvoSummaryResult {
    summaries: ConvoSummary[];
    usage: {
        input: number;
        output: number;
    }
}

export const generateConvoSummaries = async (
    convos: { user: ChatMessage, model: ChatMessage }[],
    startingSerialNumber: number
): Promise<ConvoSummaryResult> => {
    const ai = getAiClient();
    const systemInstruction = `You are a conversation summarizer. For each user/AI convo pair provided, create a concise 4-5 line summary of the AI's response. Extract the user's original input text.
Respond ONLY with a valid JSON array matching the schema.`;

    const convoText = convos.map((convo, index) => 
        `---
Convo Index: ${index}
User Input: "${convo.user.content}"
AI Response: "${convo.model.content}"
---`
    ).join('\n');
    
    const prompt = `Generate summaries for the following conversation pairs:\n${convoText}`;
    
    const fallbackResult: ConvoSummaryResult = { summaries: [], usage: { input: 0, output: 0 }};

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            convo_index: { type: Type.INTEGER },
                            user_input: { type: Type.STRING },
                            summary: { type: Type.STRING }
                        },
                        required: ["convo_index", "user_input", "summary"]
                    }
                }
            }
        });
        const jsonText = response.text.trim();
        const summariesData: { convo_index: number; user_input: string; summary: string; }[] = JSON.parse(jsonText);

        const summaries = summariesData.map((data): ConvoSummary | null => {
            const originalConvo = convos[data.convo_index];
            if (!originalConvo) return null;

            return {
                id: crypto.randomUUID(),
                userMessageId: originalConvo.user.id,
                modelMessageId: originalConvo.model.id,
                serialNumber: startingSerialNumber + data.convo_index + 1,
                userInput: data.user_input,
                summary: data.summary,
            };
        }).filter((s): s is ConvoSummary => s !== null);
        
        const usage = {
            input: response.usageMetadata?.promptTokenCount || 0,
            output: response.usageMetadata?.candidatesTokenCount || 0,
        };
        
        return { summaries, usage };

    } catch (error) {
        console.error("Error generating convo summaries:", error);
        return fallbackResult;
    }
};