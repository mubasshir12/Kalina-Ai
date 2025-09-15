import { getAiClient } from "./aiClient";

export interface AiHelpResult {
    helpText: string;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
}

export const getAiHelpForError = async (
    error: { message: string, stack?: string },
    language: 'English' | 'Hinglish'
): Promise<AiHelpResult> => {
    const ai = getAiClient();

    const languageInstruction = language === 'Hinglish'
        ? "\n\n**IMPORTANT:** You MUST provide your entire response in Hinglish (a mix of Hindi and English, using roman script)."
        : "\n\n**IMPORTANT:** You MUST provide your entire response in English.";

    const systemInstruction = `You are an expert software developer and debugger. Analyze the provided error message and stack trace from a web application and provide a concise, helpful explanation and a potential solution.${languageInstruction}

**Your response MUST be:**
1.  **Explanation:** A brief, clear explanation of what the error means in the context of a React/TypeScript web app.
2.  **Possible Solution:** A concrete suggestion or code snippet to fix the issue.

Structure your response clearly using markdown. Do not add any conversational fluff or greetings.`;

    const prompt = `Error Message:
\`\`\`
${error.message}
\`\`\`

Stack Trace:
\`\`\`
${error.stack || 'No stack trace available.'}
\`\`\`

Provide an explanation and a possible solution.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                thinkingConfig: { thinkingBudget: 0 }
            }
        });
        
        const usage = {
            inputTokens: response.usageMetadata?.promptTokenCount || 0,
            outputTokens: response.usageMetadata?.candidatesTokenCount || 0,
        };
        
        return { helpText: response.text.trim(), usage };
    } catch (apiError) {
        console.error("AI help service failed:", apiError);
        return {
            helpText: "Sorry, I couldn't analyze this error. My own help service seems to be down.",
            usage: { inputTokens: 0, outputTokens: 0 }
        };
    }
};