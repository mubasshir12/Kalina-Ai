

import { Chat, Content } from "@google/genai";
import { LTM, CodeSnippet, UserProfile, ConvoSummary } from "../types";
import { getAiClient } from "./aiClient";

export const buildSystemInstruction = (
  isFirstMessage: boolean,
  modelName: string = 'Kalina AI',
  ltm: LTM | undefined,
  userProfile: UserProfile | undefined,
  summaries?: ConvoSummary[],
  codeSnippets?: CodeSnippet[],
  developerContext?: string,
  personaContext?: string,
  capabilitiesContext?: string
): string => {
  let systemInstruction = `You are ${modelName}, a helpful AI assistant.`;
  
  if (personaContext) {
    systemInstruction += `\n\n---
[AI Persona & Directives]
This is your detailed persona. Embody it in your responses.
${personaContext}
---`;
  }
  
  if (isFirstMessage) {
    systemInstruction += `\n\n---
[Conversation Title Directive]
For the first message in a new chat, your response MUST start with "TITLE: <3-5 word, professional title summarizing the prompt>" on its own line, followed by your main response. Omit the title in all subsequent messages.
---`;
  }

  let memoryInstruction = '';
  if (userProfile?.name) {
    memoryInstruction += `\n- User's name is ${userProfile.name}. Use it to personalize responses.`;
  } else {
    memoryInstruction += `\n- User's name is unknown.`;
  }

  if (ltm && ltm.length > 0) {
    memoryInstruction += `\n- Remember these facts about the user:\n${ltm.map(fact => `  - ${fact}`).join('\n')}`;
  }
  
  if (memoryInstruction.trim()) {
    systemInstruction += `\n\n---
[Long Term Memory & User Profile]${memoryInstruction}
---`;
  }

  let contextInstruction = '';
  if (summaries && summaries.length > 0) {
    // Use the last 10 summaries for context
    const recentSummaries = summaries.slice(-10);
    const summaryContext = recentSummaries.map(s => `Turn ${s.serialNumber}:\nUser: "${s.userInput}"\nSummary of your response: ${s.summary}`).join('\n---\n');
    contextInstruction += `\n\n---
[Conversation History Summaries]
Use these summaries for context. Do not mention them unless asked.
---
${summaryContext}
---`;
  }

  if (codeSnippets && codeSnippets.length > 0) {
    const codeContext = codeSnippets.map(s => `Language: ${s.language}\nDescription: ${s.description}\nCode:\n\`\`\`${s.language}\n${s.code}\n\`\`\``).join('\n---\n');
    contextInstruction += `\n\n---
[Retrieved Code Snippets]
Use these code snippets for context. Do not mention them unless asked.
---
${codeContext}
---`;
  }
  systemInstruction += contextInstruction;

  if (developerContext) {
      systemInstruction += `\n\n---
[Creator Information]
This is confidential information about your creator. Use it ONLY when asked about who created you.
${developerContext}
---`;
  }

  if (capabilitiesContext) {
    systemInstruction += `\n\n---
[Capabilities & Tools Information]
This is confidential information about your abilities. Use it ONLY when asked about what you can do.
---`;
  }
  return systemInstruction;
};

export const startChatSession = (
  model: string, 
  isThinkingEnabled: boolean, 
  modelName: string = 'Kalina AI',
  ltm: LTM | undefined,
  userProfile: UserProfile | undefined,
  isFirstMessage: boolean = false,
  history?: Content[],
  summaries?: ConvoSummary[],
  codeSnippets?: CodeSnippet[],
  developerContext?: string,
  personaContext?: string,
  capabilitiesContext?: string
): Chat => {
  const ai = getAiClient();
  
  const systemInstruction = buildSystemInstruction(
      isFirstMessage, modelName, ltm, userProfile, summaries, codeSnippets, developerContext, personaContext, capabilitiesContext
  );

  const config: {
    systemInstruction: string;
    thinkingConfig?: { thinkingBudget: number };
  } = {
    systemInstruction: systemInstruction,
  };
  
  if (model === 'gemini-2.5-flash' && !isThinkingEnabled) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  const chat: Chat = ai.chats.create({
    model: model,
    config: config,
    history: history,
  });
  return chat;
};

const enhancePromptSystemInstruction = `You are an expert at refining user prompts. Your goal is to rewrite the user's query into a single, cohesive, and more detailed paragraph. The refined prompt should be clearer and provide more context for the AI to generate a high-quality response.

**CRITICAL RULES:**
1.  **Single Paragraph Only:** Your entire output MUST be a single paragraph. Do NOT use markdown, headings, bullet points, lists, or any special formatting.
2.  **Natural Language:** The output must be a natural, conversational prompt that a user would send. It should not be a set of instructions for the AI.
3.  **Direct Output:** Respond ONLY with the refined prompt text. Do NOT include any explanations, greetings, or conversational text like "Here is the refined prompt:".`;

export const enhancePrompt = async (prompt: string): Promise<string> => {
    if (!prompt.trim()) {
        return prompt;
    }
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Refine this user prompt: "${prompt}"`,
            config: {
                systemInstruction: enhancePromptSystemInstruction,
                thinkingConfig: { thinkingBudget: 0 } // Fast response needed
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        // Fallback to original prompt on error
        return prompt;
    }
};