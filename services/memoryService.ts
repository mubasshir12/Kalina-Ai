
import { Content, Type } from "@google/genai";
import { LTM, UserProfile } from "../types";
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

export const summarizeConversation = async (
    history: Content[],
    previousSummary?: string
): Promise<string> => {
    const ai = getAiClient();
    const systemInstruction = `You are an expert conversation summarizer for an AI's memory. Create a concise summary of recent conversation turns, integrating new info with any previous summary.
Focus on:
1. User's GOAL.
2. Key AI decisions (tools used).
3. Final OUTCOME.
Format as bullet points. Respond ONLY with the summary text.`;
    
    const historyText = history.map(h => `${h.role}: ${h.parts.map(p => (p as any).text || '').join(' ')}`).join('\n');
    const prompt = `PREVIOUS SUMMARY:\n${previousSummary || 'None'}\n\nRECENT CONVERSATION:\n${historyText}\n\nBased on the above, provide an updated summary.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error summarizing conversation:", error);
        return previousSummary || ''; // Return old summary on error
    }
};
