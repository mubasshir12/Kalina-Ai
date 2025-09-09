import { Part, Type } from "@google/genai";
import { getAiClient } from "./aiClient";

const planAndThinkSystemInstruction = `You are an AI planner. Analyze the user's prompt to determine the best response strategy by classifying it. Your primary goal is to distinguish between web search, URL read, complex, and simple prompts.

**1. Web Search (needsWebSearch: true):**
Set to true for queries needing real-time or up-to-date info (news, current events, live data like stock prices or weather, or the current time/date).
**CRITICAL RULE: Perform a fresh web search for ANY query that could be time-sensitive or relate to current events. You MUST IGNORE all previous conversation context and your internal knowledge for such queries to ensure the information is absolutely current. When in doubt, ALWAYS default to a web search.**

**2. URL Read (isUrlReadRequest: true):**
Set to true if the prompt contains a URL and asks a question about its content (e.g., "summarize this").

**3. Creator Inquiry (isCreatorRequest: true):**
Set to true if the user asks who created you, your developer, or your origin.

**4. Capabilities Inquiry (isCapabilitiesRequest: true):**
Set to true if the user asks what you can do, about your tools, or your abilities (e.g., "what are your skills?", "can you generate images?").

**5. Molecule Visualization (isMoleculeRequest: true):**
Set to true if the user asks to see a 3D model or structure of a chemical compound (e.g., "show me water in 3D", "what does caffeine look like?"). Extract the name of the compound into \`moleculeName\`.

**6. File Analysis:**
- If a file is attached, always set 'needsThinking' to true.

**7. Complex Prompts (needsThinking: true):**
Set to true for prompts requiring analysis, creativity, multi-step reasoning, coding, or file analysis.

**8. Simple Prompts (needsThinking: false):**
Set to false for basic conversational turns.

**Output:**
Respond ONLY with a valid JSON object based on the prompt analysis.

**JSON Schema:**
- \`needsWebSearch\` (boolean): Requires up-to-date info.
- \`isUrlReadRequest\` (boolean): URL found and needs to be analyzed.
- \`isCreatorRequest\` (boolean): User is asking about the developer.
- \`isCapabilitiesRequest\` (boolean): User is asking about your abilities.
- \`isMoleculeRequest\` (boolean): User is asking for a 3D model of a molecule.
- \`moleculeName\` (string, optional): The name of the molecule if \`isMoleculeRequest\` is true.
- \`needsThinking\` (boolean): Complex task.
- \`needsCodeContext\` (boolean): Prompt relates to previous code.
- \`thoughts\` (array, optional): If 'needsThinking' is true, provide a step-by-step plan.
- \`searchPlan\` (array, optional): If 'needsWebSearch' is true, provide a research plan.

**'thoughts' & 'searchPlan' item structure:**
Each item must be an object with 'phase', 'step', and 'concise_step' (3-5 words ending in '-ing'). The final 'concise_step' for 'thoughts' must be dynamic and end in '-ing' (e.g., 'Generating response...').`;

export interface ThoughtStep {
    phase: string;
    step: string;
    concise_step: string;
}
export interface ResponsePlan {
    needsWebSearch: boolean;
    isUrlReadRequest: boolean;
    isCreatorRequest: boolean;
    isCapabilitiesRequest: boolean;
    needsThinking: boolean;
    needsCodeContext: boolean;
    isMoleculeRequest: boolean;
    moleculeName?: string;
    thoughts: ThoughtStep[];
    searchPlan?: ThoughtStep[];
}

export const planResponse = async (prompt: string, images?: { base64: string; mimeType: string; }[], file?: { base64: string; mimeType: string; name: string; }, model: string = 'gemini-2.5-flash'): Promise<ResponsePlan> => {
    const ai = getAiClient();
    try {
        const contentParts: Part[] = [{ text: prompt }];
        if (images && images.length > 0) {
            contentParts.unshift({ text: `[User has attached ${images.length} image(s)]` });
        }
        if (file) {
            contentParts.push({ text: `[User has attached a file named: ${file.name}]` });
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: contentParts },
            config: {
                systemInstruction: planAndThinkSystemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        needsWebSearch: { type: Type.BOOLEAN },
                        isUrlReadRequest: { type: Type.BOOLEAN },
                        isCreatorRequest: { type: Type.BOOLEAN },
                        isCapabilitiesRequest: { type: Type.BOOLEAN },
                        isMoleculeRequest: { type: Type.BOOLEAN },
                        moleculeName: { type: Type.STRING },
                        needsThinking: { type: Type.BOOLEAN },
                        needsCodeContext: { type: Type.BOOLEAN },
                        thoughts: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    phase: { type: Type.STRING },
                                    step: { type: Type.STRING },
                                    concise_step: { type: Type.STRING }
                                },
                                required: ["phase", "step", "concise_step"]
                            }
                        },
                        searchPlan: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    phase: { type: Type.STRING },
                                    step: { type: Type.STRING },
                                    concise_step: { type: Type.STRING }
                                },
                                required: ["phase", "step", "concise_step"]
                            }
                        }
                    },
                    required: ["needsWebSearch", "isUrlReadRequest", "isCreatorRequest", "isCapabilitiesRequest", "needsThinking", "needsCodeContext", "isMoleculeRequest"],
                }
            }
        });
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);

        // If a tool-based request is made, disable general thinking to go straight to the task.
        if (result.needsWebSearch || result.isUrlReadRequest || result.isMoleculeRequest) {
            result.needsThinking = false;
            result.thoughts = [];
        }

        return { ...result, thoughts: result.thoughts || [], searchPlan: result.searchPlan || [] };
    } catch (error)
    {
        console.error("Error planning response:", error);
        // Fallback: If planning fails, assume web search is needed but disable thinking.
        const needsWebSearch = true;
        return { 
            needsWebSearch: needsWebSearch,
            isUrlReadRequest: false,
            isCreatorRequest: false,
            isCapabilitiesRequest: false,
            needsThinking: !needsWebSearch, // Ensures thinking is false if web search is true
            needsCodeContext: false, // <-- Changed from true to false for token efficiency on error
            isMoleculeRequest: false,
            thoughts: [], // No thoughts when thinking is disabled
            searchPlan: []
        };
    }
};
