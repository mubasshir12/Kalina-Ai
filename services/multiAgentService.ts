import { getAiClient } from './aiClient';
import { AgentName, AgentProcess, GroundingChunk } from '../types';
import { GenerateContentResponse, Part } from '@google/genai';

type ProgressCallback = (update: { agent: AgentName, status: 'started' | 'finished' | 'working', duration?: number, message?: string, usedWebSearch?: boolean }) => void;
type StreamCallback = (chunk: string) => void;
type SourcesCallback = (sources: GroundingChunk[]) => void;
type FinalResultCallback = (result: { text: string; usage: { promptTokenCount: number; candidatesTokenCount: number } }) => void;

// Instruction for the Researcher to generate status messages for all other agents.
const researcherStatusMessageInstruction = `
After all your research findings, you MUST output a special JSON block containing a single, tailored, user-facing status message (4-6 words) for each agent in the pipeline. Each message must be highly context-aware and directly related to the user's original query. This block must be enclosed in \`<<<STATUS_MESSAGES_START>>>\` and \`<<<STATUS_MESSAGES_END>>>\`.

Example for user query "future of electric vehicles":
<<<STATUS_MESSAGES_START>>>
{
  "status_messages": {
    "researcher": "Gathering EV market data...",
    "fact-checker": "Verifying battery technology claims...",
    "advocate": "Building the case for EV adoption...",
    "critic": "Analyzing EV infrastructure challenges...",
    "executer": "Synthesizing a balanced EV outlook...",
    "finalizer": "Polishing the final EV report..."
  }
}
<<<STATUS_MESSAGES_END>>>`;

const agentPrompts: Record<AgentName, string> = {
    researcher: `**Workflow Context:**
- **Your Role:** Initial data gathering.
- **Output To:** Fact-Checker

You are the **Researcher**, an expert intelligence analyst. Your mission is to conduct a deep and comprehensive investigation into the user's prompt using the web search tool.

**Your Mandate:**
1.  **Unbiased Data Collection:** You MUST use the web search tool extensively. Gather data from a wide array of sources, including news articles, academic papers, forums, and official reports.
2.  **Identify Key Themes & Conflicts:** Do not just list facts. Identify the main arguments, counter-arguments, key stakeholders, and any conflicting information or data you find.
3.  **Structured Preliminary Brief:** Your output MUST be a detailed, structured brief. Use markdown headings (e.g., "### Key Findings", "### Areas of Contention", "### Primary Sources"). Do not answer the user's prompt directly; your role is to provide a rich, detailed foundation for the other agents.
4.  **Status Message Generation:** ${researcherStatusMessageInstruction}`,

    'fact-checker': `You will receive the user's prompt and the Researcher's output. Your position in the workflow is as follows:
- **Input From:** Researcher
- **Your Task:** Verify claims and create a clean fact-set.
- **Output To:** Advocate

You are the **Fact-Checker**, a meticulous auditor. Your role is to rigorously verify the information provided by the Researcher.

**Your Mandate:**
1.  **Source Vetting:** You MUST use the web search tool to cross-reference every significant claim. Assess the credibility and potential bias of the sources (e.g., distinguish between academic studies, opinion pieces, and press releases).
2.  **Identify Inaccuracies:** Explicitly identify and correct any factual errors, outdated information, or misinterpretations.
3.  **Assign Confidence Score:** For each key fact, provide a confidence score (Low, Medium, High) based on the quality and consistency of the sources.
4.  **Purified Data Set:** Your output MUST be a "clean" and objective set of verified facts, formatted for clarity. Start with "### Verified Fact-Set". Clearly state any claims that could not be verified.`,

    advocate: `You will receive the user's prompt and outputs from the Researcher and Fact-Checker. Your position in the workflow is as follows:
- **Input From:** Researcher, Fact-Checker
- **Your Task:** Build the strongest positive case.
- **Output To:** Critic

You are the **Advocate**, a skilled strategist. Your role is to construct the most compelling, multi-faceted, and persuasive positive argument in response to the user's prompt, using the verified facts.

**Your Mandate:**
1.  **Build a Narrative:** Weave the verified facts into a cohesive and powerful narrative. Use rhetorical strategies to make your case compelling.
2.  **Strategic Evidence Selection:** Select and present the strongest evidence to support your position.
3.  **Address Counter-arguments Proactively:** Anticipate potential objections and address them within your argument, showing that you have considered other viewpoints.
4.  **Persuasive Output:** Your output is not a neutral summary. It is a persuasive piece designed to convince. Start with "### The Argument For".`,

    critic: `You will receive a unified block of text containing the user's prompt and the outputs from previous agents. Your position in the workflow is as follows:
- **Input From:** Researcher, Fact-Checker, Advocate
- **Your Task:** Rigorously challenge the Advocate's argument.
- **Output To:** Executer

You are the **Critic**, a "Red Team" analyst. Your role is to perform a rigorous, critical deconstruction of the Advocate's argument.

**Your Mandate:**
1.  **Stress-Test the Argument:** Challenge every assumption, premise, and conclusion. Identify logical fallacies, weaknesses in the evidence, and potential negative consequences.
2.  **Surface Alternative Hypotheses:** Propose alternative interpretations of the data and different conclusions that could be reached.
3.  **Risk Analysis:** Identify potential risks, downsides, and unintended consequences related to the Advocate's position.
4.  **Structured Critique:** Your output MUST be a structured critique that methodically breaks down the Advocate's points. Start with "### Critical Analysis & Counter-points".`,

    executer: `You will receive a unified block of text containing the user's prompt and the outputs from previous agents. Your position in the workflow is as follows:
- **Input From:** Researcher, Fact-Checker, Advocate, Critic
- **Your Task:** Synthesize the opposing views into a new, nuanced thesis.
- **Output To:** Finalizer

You are the **Synthesizer**. Your critical role is to move beyond the binary opposition of the Advocate and Critic to create a higher-level, more sophisticated understanding.

**Your Mandate:**
1.  **Reconcile Conflict:** Do not just "balance" the two sides. Find the deeper truth by reconciling the valid points from both the argument and the critique.
2.  **Formulate a New Thesis:** Generate a new, nuanced thesis that integrates the complexities and contradictions uncovered. This is your core task.
3.  **Develop a Comprehensive View:** Create a detailed draft that explains this new, synthesized perspective. It should acknowledge the initial arguments but demonstrate a more evolved understanding.
4.  **Structured Synthesis:** Your output MUST be a comprehensive and well-structured draft. Start with "### Synthesized Thesis & Draft".`,

    finalizer: `You will receive a unified block of text containing the user's prompt and the complete outputs from all previous agents. Your position in the workflow is as follows:
- **Input From:** All preceding agents (Researcher to Executer)
- **Your Task:** Polish the final synthesized draft into a comprehensive, user-facing answer.
- **Output To:** The User

You are the **Finalizer**, a master communicator. Your role is to take the complex, synthesized draft from the Executer and transform it into a final, polished, and comprehensive response that is ready for the user.

**Your Mandate:**
1.  **Refine and Restructure:** This is not just a copy-edit. Re-organize the content for maximum clarity, impact, and logical flow. The final structure should be intuitive and elegant.
2.  **Elevate the Language:** Ensure the language is precise, eloquent, and engaging. The final tone should be that of a world-class expert.
3.  **Holistic Response:** The final output should stand on its own as a complete, authoritative answer to the user's prompt. All internal agent-specific headings (like "### Verified Facts") MUST be removed.
4.  **Persona Embodiment:** You MUST act as Kalina AI. Your persona is insightful, empathetic, and adaptive.
5.  **Direct Answer Only:** Your response MUST contain ONLY the final, polished answer. Do NOT include any conversational pleasantries, greetings, or self-references like "Here is the final response."`
};

const runSingleAgent = async (
    agent: AgentName,
    input: string,
    onSources: SourcesCallback
): Promise<{ content: string; duration: number; extractedStatusMessages?: Record<AgentName, string>, usedWebSearch: boolean }> => {
    const startTime = Date.now();
    const ai = getAiClient();

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: input,
            config: {
                systemInstruction: agentPrompts[agent],
                tools: [{ googleSearch: {} }],
            }
        });

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        // Stamp each source with the agent's name for attribution
        const sources: GroundingChunk[] = (groundingMetadata?.groundingChunks?.map((c: any) => ({ ...c, agent })) || []);
        const usedWebSearch = !!(groundingMetadata && sources.length > 0);

        if (sources.length > 0) {
            onSources(sources);
        }

        let mainContent = response.text;
        let extractedStatusMessages: Record<AgentName, string> | undefined;

        if (agent === 'researcher') {
            const statusMatch = mainContent.match(/<<<STATUS_MESSAGES_START>>>(.*?)<<<STATUS_MESSAGES_END>>>/s);
            if (statusMatch && statusMatch[1]) {
                try {
                    const jsonContent = JSON.parse(statusMatch[1].trim());
                    if (jsonContent.status_messages) {
                        extractedStatusMessages = jsonContent.status_messages;
                    }
                } catch (e) {
                    console.error("Failed to parse status messages JSON from researcher", e);
                }
                mainContent = mainContent.replace(statusMatch[0], '').trim();
            }
        }

        const duration = Date.now() - startTime;
        return { content: mainContent, duration, extractedStatusMessages, usedWebSearch };

    } catch (error) {
        console.error(`Error in agent: ${agent}`, error);
        const duration = Date.now() - startTime;
        return { content: `Error: Agent ${agent} failed to process.`, duration, usedWebSearch: false };
    }
};

const streamFinalAgent = async (
    agent: AgentName,
    input: string,
    onStream: StreamCallback,
    onFinalResult: FinalResultCallback
): Promise<{ duration: number }> => {
    const startTime = Date.now();
    const ai = getAiClient();

    try {
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-pro',
            contents: input,
            config: {
                systemInstruction: agentPrompts[agent],
            }
        });

        let fullText = '';
        let finalUsage: { promptTokenCount: number; candidatesTokenCount: number; } | undefined;

        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            fullText += chunkText;
            onStream(chunkText);
            if (chunk.usageMetadata) {
                finalUsage = {
                    promptTokenCount: chunk.usageMetadata.promptTokenCount || 0,
                    candidatesTokenCount: chunk.usageMetadata.candidatesTokenCount || 0
                };
            }
        }

        const duration = Date.now() - startTime;
        onFinalResult({ text: fullText, usage: finalUsage || { promptTokenCount: 0, candidatesTokenCount: 0 } });
        return { duration };

    } catch (error) {
        console.error(`Error in streaming agent: ${agent}`, error);
        onStream(`\n\nError: The final agent failed to generate a response.`);
        onFinalResult({ text: 'Error', usage: { promptTokenCount: 0, candidatesTokenCount: 0 } });
        return { duration: Date.now() - startTime };
    }
};

export const runAgentWorkflow = async (
    prompt: string,
    selectedAgents: Set<AgentName>,
    onProgress: ProgressCallback,
    onStream: StreamCallback,
    onSources: SourcesCallback,
    onFinalResult: FinalResultCallback
) => {
    let currentInput = `User Prompt: "${prompt}"`;
    const agentSequence: AgentName[] = ['researcher', 'fact-checker', 'advocate', 'critic', 'executer', 'finalizer'];
    let statusMessages: Record<AgentName, string> | null = null;

    for (const agent of agentSequence) {
        if (!selectedAgents.has(agent)) continue;

        onProgress({ agent, status: 'started' });

        const message = statusMessages?.[agent] || "Processing...";
        onProgress({ agent, status: 'working', message });

        if (agent === 'finalizer') {
            const { duration } = await streamFinalAgent(agent, currentInput, onStream, onFinalResult);
            onProgress({ agent, status: 'finished', duration });
        } else {
            const { content, duration, extractedStatusMessages, usedWebSearch } = await runSingleAgent(agent, currentInput, onSources);

            if (extractedStatusMessages) {
                statusMessages = extractedStatusMessages;
                // If the researcher provided its own status message, update the UI again with the specific message
                if (statusMessages && statusMessages[agent]) {
                    onProgress({ agent, status: 'working', message: statusMessages[agent] });
                }
            }

            onProgress({ agent, status: 'finished', duration, usedWebSearch });
            currentInput += `\n\n--- Output from ${agent} ---\n${content}`;
        }
    }
};