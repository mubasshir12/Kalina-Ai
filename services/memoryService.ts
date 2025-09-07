
import { Content, Type } from "@google/genai";
import { LTM, UserProfile, ChatMessage, ConvoSummary } from "../types";
import { getAiClient } from "./aiClient";

const getMemoryUpdateSystemInstruction = (userName: string | null): string => `You are a selective memory AI. Your goal is to extract, update, and manage long-term facts about the user.

**User Info:**
- Current Name: ${userName || 'Unknown'}

**Core Tasks:**
1.  **Extract User Name:** If the user provides a new name, capture it in 'user_profile_updates'.
2.  **Extract New Facts:** Identify new, stable, personal facts about the user.
3.  **Update Existing Facts:** If new info contradicts an existing fact in 'CURRENT LTM', create an update operation specifying the 'old_memory' and 'new_memory'.
4.  **Prioritize New Name:** When a new name is found, use it immediately in all new/updated facts in the same response. If no new name, use the current one or "The user" if unknown.
5.  **Handle Explicit Saves:** If the user says "remember..." or "save...", you MUST save the specified info as a new fact, overriding other filters.

**Critical Filter (unless an explicit save command):**
- **SAVE:** Long-term, personal facts about the user.
- **IGNORE:** General knowledge, temporary interests, or transactional details.

**Rules:**
- Do not add duplicate facts (rephrased info).
- Do not add facts that contradict old ones; use an 'update' instead.

**Output:**
Respond ONLY with a valid JSON object matching the provided schema.`;

export interface MemoryUpdate {
    old_memory: string;
    new_memory: string;
}

export interface MemoryUpdateResult {
    newMemories: string[];
    updatedMemories: MemoryUpdate[];
    userProfileUpdates: Partial<UserProfile>;
}


export const updateMemory = async (
    lastMessages: Content[],
    currentLtm: LTM,
    userProfile: UserProfile,
    model: string = 'gemini-2.5-flash'
): Promise<MemoryUpdateResult> => {
    const ai = getAiClient();
    const historyString = lastMessages.map(m => {
        const textParts = m.parts.map(p => (p as any).text || '[non-text part]').join(' ');
        return `${m.role}: ${textParts}`;
    }).join('\n');
    
    const ltmString = currentLtm.length > 0 ? JSON.stringify(currentLtm) : "[]";

    const prompt = `CURRENT LTM:
${ltmString}

NEW CONVERSATION TURNS:
${historyString}

Analyze the conversation and LTM, then generate the JSON output as instructed.`;

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
                        }
                    },
                    required: ["new_memories", "updated_memories", "user_profile_updates"]
                },
            }
        });
        const jsonText = response.text.trim();
        const parsed = JSON.parse(jsonText);
        return {
            newMemories: parsed.new_memories || [],
            updatedMemories: parsed.updated_memories || [],
            userProfileUpdates: parsed.user_profile_updates || {}
        };
    } catch (error) {
        console.error("Error updating memory:", error);
        return { newMemories: [], updatedMemories: [], userProfileUpdates: {} };
    }
};

export const generateConvoSummaries = async (
    convos: { user: ChatMessage, model: ChatMessage }[],
    startingSerialNumber: number
): Promise<ConvoSummary[]> => {
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

        return summariesData.map((data): ConvoSummary | null => {
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
            // FIX: Add explicit return type to the map callback to satisfy the type predicate in the filter.
            // This ensures the object's inferred type with a specific UUID string for `id` is compatible with
            // the `ConvoSummary` type which expects a general `string`.
        }).filter((s): s is ConvoSummary => s !== null);

    } catch (error) {
        console.error("Error generating convo summaries:", error);
        return [];
    }
};
