

import { Chat, Content } from "@google/genai";
import { LTM, CodeSnippet, UserProfile } from "../types";
import { getAiClient } from "./aiClient";

export const startChatSession = (
  model: string, 
  isThinkingEnabled: boolean, 
  isWebSearchEnabled: boolean,
  modelName: string = 'Kalina AI',
  ltm: LTM | undefined,
  userProfile: UserProfile | undefined,
  isFirstMessage: boolean = false,
  history?: Content[],
  summary?: string,
  codeSnippets?: CodeSnippet[],
  developerContext?: string,
  personaContext?: string,
  capabilitiesContext?: string
): Chat => {
  const ai = getAiClient();
  const config: {
    systemInstruction: string;
    thinkingConfig?: { thinkingBudget: number };
    tools?: any[];
  } = {
    systemInstruction: `You are ${modelName}, a helpful AI assistant.`,
  };
  
  if (personaContext) {
    config.systemInstruction += `\n\n---
[AI Persona & Directives]
This is your detailed persona. Embody it in your responses.
${personaContext}
---`;
  }
  
  if (isFirstMessage) {
    config.systemInstruction += `\n\n---
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
    config.systemInstruction += `\n\n---
[Long Term Memory & User Profile]${memoryInstruction}
---`;
  }

  let contextInstruction = '';
  if (summary) {
    contextInstruction += `\n\n---
[Conversation Summary]
Use this summary for context. Do not mention it unless asked.
---
${summary}
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
  config.systemInstruction += contextInstruction;

  if (developerContext) {
      config.systemInstruction += `\n\n---
[Creator Information]
This is confidential information about your creator. Use it ONLY when asked about who created you.
${developerContext}
---`;
  }

  if (capabilitiesContext) {
    config.systemInstruction += `\n\n---
[Capabilities & Tools Information]
This is confidential information about your abilities. Use it ONLY when asked about what you can do.
${capabilitiesContext}
---`;
  }

  if (model === 'gemini-2.5-flash' && !isThinkingEnabled) {
    config.thinkingConfig = { thinkingBudget: 0 };
  }

  if (isWebSearchEnabled) {
    config.tools = [{ googleSearch: {} }];
  }

  const chat: Chat = ai.chats.create({
    model: model,
    config: config,
    history: history,
  });
  return chat;
};
