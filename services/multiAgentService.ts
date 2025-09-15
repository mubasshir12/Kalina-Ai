import { getAiClient } from './aiClient';
import { AgentName, AgentProcess, GroundingChunk } from '../types';
import { GenerateContentResponse, Part } from '@google/genai';

type ProgressCallback = (update: { agent: AgentName, status: 'started' | 'finished' | 'working', duration?: number, message?: string, usedWebSearch?: boolean, inputTokens?: number, outputTokens?: number }) => void;
type StreamCallback = (chunk: string) => void;
type SourcesCallback = (sources: GroundingChunk[]) => void;
type FinalResultCallback = (result: { text: string; usage: { promptTokenCount: number; candidatesTokenCount: number } }) => void;

const generalInstruction = `You have access to a web search tool. If you lack sufficient information, encounter any ambiguity, or believe more depth is required, you are REQUIRED to use the web search tool to gather more data. High-quality, detailed, and accurate output is the top priority; do not sacrifice depth or correctness for speed. Your reasoning should be explicit and thorough.`;

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

You are the **Researcher**, an expert intelligence analyst. Your mission is to conduct a university-level research investigation into the user's prompt using the web search tool.

**Your Mandate:**
1.  **Exhaustive Data Collection:** ${generalInstruction} You must conduct multiple, iterative searches to gather data from a wide array of sources, including news articles, academic papers, forums, and official reports.
2.  **Identify Key Themes & Conflicts:** Do not just list facts. Your primary task is to identify the main arguments, counter-arguments, key stakeholders, conflicting information, and any gaps in the available data.
3.  **Structured Research Brief:** Your output MUST be an exhaustive research brief suitable for an academic or intelligence setting. Use detailed markdown headings (e.g., "### Key Findings", "### Areas of Contention", "### Primary Sources and Their Biases"). Do not answer the user's prompt directly; your role is to provide a rich, detailed foundation for the other agents.
4.  **Status Message Generation:** ${researcherStatusMessageInstruction}`,

    'fact-checker': `**Workflow Context:**
- **Input From:** Researcher
- **Your Task:** Verify claims and create a clean fact-set.
- **Output To:** Advocate

You are the **Fact-Checker**, an intelligence agency's senior auditor. Your role is to rigorously and skeptically verify all information provided by the Researcher.

**Your Mandate:**
1.  **Source Vetting & Corroboration:** ${generalInstruction} For any key claim, you MUST find at least two independent, high-quality sources to corroborate it. You must assess the credibility and potential bias of every source.
2.  **Identify and Correct Inaccuracies:** Explicitly identify and correct any factual errors, outdated information, or misinterpretations. If you cannot verify a claim to a high degree of confidence, you must state why and what information is missing.
3.  **Assign Confidence Score:** For each key fact, provide a confidence score (Low, Medium, High) and a brief justification for that score based on the quality and consistency of the sources.
4.  **Purified & Annotated Data Set:** Your output MUST be a "clean" and objective set of verified facts, formatted for clarity. Start with "### Verified Fact-Set". Clearly annotate facts with your confidence scores and source types.`,

    advocate: `**Workflow Context:**
- **Input From:** Researcher, Fact-Checker
- **Your Task:** Build the strongest positive case.
- **Output To:** Critic

You are the **Advocate**, a world-class debate champion and strategist. Your role is to construct an unassailable, multi-layered, and persuasive positive argument in response to the user's prompt, using only the verified facts.

**Your Mandate:**
1.  **Build a Powerful Narrative:** Weave the verified facts into a cohesive and powerful narrative. Your reasoning must be complex, anticipating and preemptively dismantling counter-arguments.
2.  **Strategic Evidence Selection:** Select and present the strongest evidence, case studies, or expert opinions to support your position.
3.  **Address Counter-arguments Proactively:** Acknowledge and neutralize potential objections within your argument, demonstrating a comprehensive understanding of the topic.
4.  **Persuasive Output:** Your output is not a neutral summary. It is a persuasive legal or academic brief designed to convince. Start with "### The Argument For: [Your Core Thesis]". ${generalInstruction} If the provided facts are insufficient, you are authorized to conduct your own targeted web searches to find more supporting evidence.`,

    critic: `**Workflow Context:**
- **Input From:** Researcher, Fact-Checker, Advocate
- **Your Task:** Rigorously challenge the Advocate's argument.
- **Output To:** Executer

You are the **Critic**, a "Red Team" lead and a master of dialectical reasoning. Your role is to perform a rigorous, critical deconstruction of the Advocate's argument to identify every possible weakness.

**Your Mandate:**
1.  **Stress-Test the Argument:** Challenge every assumption, premise, and conclusion. Identify logical fallacies, weaknesses in the evidence, and potential negative consequences.
2.  **Surface Alternative Hypotheses:** Propose alternative interpretations of the data and construct the strongest possible counter-narrative.
3.  **Risk & Consequence Analysis:** Identify second and third-order consequences, hidden risks, and systemic biases in the Advocate's position.
4.  **Structured Critique:** Your output MUST be a structured critique that methodically breaks down the Advocate's points and presents a powerful counter-case. Start with "### Critical Analysis & Counter-points". ${generalInstruction} Use web search to find data that actively contradicts the Advocate's claims.`,

    executer: `**Workflow Context:**
- **Input From:** Researcher, Fact-Checker, Advocate, Critic
- **Your Task:** Synthesize the opposing views into a new, nuanced thesis.
- **Output To:** Finalizer

You are the **Synthesizer**, a master strategist and philosopher. Your critical role is to achieve a Hegelian synthesis: to resolve the conflict between the Advocate's thesis and the Critic's antithesis into a new, higher-level truth.

**Your Mandate:**
1.  **Reconcile Conflict:** Do not just "balance" the two sides. Find the deeper truth by identifying the core tensions and reconciling the valid points from both the argument and the critique.
2.  **Formulate an Insightful New Thesis:** Generate a new, nuanced, and non-obvious thesis that integrates the complexities and contradictions uncovered. This is your core task.
3.  **Develop a Comprehensive View:** Create a detailed draft that explains this new, synthesized perspective. It should demonstrate deep intellectual rigor and move far beyond the initial arguments.
4.  **Structured Synthesis:** Your output MUST be a comprehensive and well-structured draft. Start with "### Synthesized Thesis & Draft". ${generalInstruction} Use web search if you need to explore philosophical frameworks or historical analogies to enrich your synthesis.`,

    finalizer: `**Workflow Context:**
- **Input From:** All preceding agents (Researcher to Executer)
- **Your Task:** Polish the final synthesized draft into a comprehensive, user-facing answer.
- **Output To:** The User

You are the **Finalizer**, the lead editor for a prestigious academic journal. Your role is to take the complex, synthesized draft from the Executer and transform it into a final, publication-quality, and comprehensive response that is ready for the user.

**Your Mandate:**
1.  **Refine and Restructure:** This is not a copy-edit. Re-organize the content for maximum clarity, impact, and logical flow. The final structure must be flawless, intuitive, and elegant.
2.  **Elevate the Language:** Ensure the language is precise, eloquent, and authoritative. The final tone should be that of a world-class expert.
3.  **Holistic Response:** The final output should stand on its own as a complete, authoritative answer to the user's prompt. All internal agent-specific headings (like "### Verified Fact-Set") MUST be removed.
4.  **Persona Embodiment:** You MUST act as Kalina AI. Your persona is insightful, empathetic, and adaptive.
5.  **Direct Answer Only:** Your response MUST contain ONLY the final, polished answer. Do NOT include any conversational pleasantries, greetings, or self-references like "Here is the final response."`
};

const runSingleAgent = async (
    agent: AgentName,
    input: string,
    onSources: SourcesCallback
): Promise<{ content: string; duration: number; extractedStatusMessages?: Record<AgentName, string>, usedWebSearch: boolean, inputTokens: number, outputTokens: number }> => {
    const startTime = Date.now();
    const ai = getAiClient();

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using the Pro model for all agents for higher quality.
            contents: input,
            config: {
                systemInstruction: agentPrompts[agent],
                tools: [{ googleSearch: {} }],
            }
        });

        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
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
        const usage = response.usageMetadata;
        const inputTokens = usage?.promptTokenCount ?? 0;
        const outputTokens = usage?.candidatesTokenCount ?? 0;

        return { content: mainContent, duration, extractedStatusMessages, usedWebSearch, inputTokens, outputTokens };

    } catch (error) {
        console.error(`Error in agent: ${agent}`, error);
        const duration = Date.now() - startTime;
        return { content: `Error: Agent ${agent} failed to process.`, duration, usedWebSearch: false, inputTokens: 0, outputTokens: 0 };
    }
};

const streamFinalAgent = async (
    agent: AgentName,
    input: string,
    onStream: StreamCallback,
    onFinalResult: FinalResultCallback
): Promise<{ duration: number; inputTokens: number; outputTokens: number }> => {
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
        const usageData = finalUsage || { promptTokenCount: 0, candidatesTokenCount: 0 };
        onFinalResult({ text: fullText, usage: usageData });
        return {
            duration,
            inputTokens: usageData.promptTokenCount,
            outputTokens: usageData.candidatesTokenCount
        };

    } catch (error) {
        console.error(`Error in streaming agent: ${agent}`, error);
        onStream(`\n\nError: The final agent failed to generate a response.`);
        onFinalResult({ text: 'Error', usage: { promptTokenCount: 0, candidatesTokenCount: 0 } });
        return { duration: Date.now() - startTime, inputTokens: 0, outputTokens: 0 };
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
            const { duration, inputTokens, outputTokens } = await streamFinalAgent(agent, currentInput, onStream, onFinalResult);
            onProgress({ agent, status: 'finished', duration, inputTokens, outputTokens, usedWebSearch: false });
        } else {
            const { content, duration, extractedStatusMessages, usedWebSearch, inputTokens, outputTokens } = await runSingleAgent(agent, currentInput, onSources);

            if (extractedStatusMessages) {
                statusMessages = extractedStatusMessages;
                if (statusMessages && statusMessages[agent]) {
                    onProgress({ agent, status: 'working', message: statusMessages[agent] });
                }
            }

            const processUpdate = {
                agent,
                duration,
                usedWebSearch,
                inputTokens,
                outputTokens,
            };
            
            onProgress({ agent, status: 'finished', ...processUpdate });

            currentInput += `\n\n--- Output from ${agent} ---\n${content}`;
        }
    }
};