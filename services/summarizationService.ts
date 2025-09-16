import { ChatMessage, Conversation, PlannerContextItem } from '../types';
import { appLogger } from './appLogger';

// Function type for updating the conversation state, imported from useConversations hook
type UpdateConversationFn = (conversationId: string, updater: (convo: Conversation) => Conversation) => void;

const taskQueue: { userMessage: ChatMessage; modelMessage: ChatMessage; conversationId: string }[] = [];
let isProcessing = false;
let updateConversationCallback: UpdateConversationFn | null = null;

// Common English and Hinglish stop words to be ignored during scoring.
const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with',
    'bhi', 'ek', 'hai', 'hain', 'hi', 'ho', 'hota', 'hui', 'hum', 'is', 'ka', 'ke', 'ki', 'ko', 'kuch', 'kya', 'main', 'mein', 'na', 'ne', 'par', 'se', 'tak', 'toh', 'ya', 'yeh'
]);


/**
 * Removes markdown code blocks from text to reduce token count for summarization.
 */
const stripCodeBlocks = (text: string): string => {
    if (!text) return '';
    return text.replace(/```[\s\S]*?```/g, '[Code Block]');
};

/**
 * Generates an intelligent, multi-sentence summary by identifying core themes,
 * weighting sentence position, and dynamically building the summary to a target length.
 * @param text The full text content to summarize.
 * @param maxLength The max length for the final summary.
 * @returns A coherent, extractive summary.
 */
const intelligentSummary = (text: string, maxLength: number): string => {
    const cleanedText = stripCodeBlocks(text).trim().replace(/\s+/g, ' ');
    if (cleanedText.length <= maxLength) return cleanedText;

    // 1. Sentence Segmentation
    const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [cleanedText];
    if (sentences.length <= 1) return cleanedText.slice(0, maxLength);

    // 2. Keyword Identification
    const words: string[] = cleanedText.toLowerCase().match(/\b(\w+)\b/g) || [];
    const keywords = words.filter(word => !STOP_WORDS.has(word) && word.length > 2);
    
    const wordFrequencies: Record<string, number> = {};
    keywords.forEach(word => {
        wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
    });

    // Use more keywords for longer texts to better capture the theme
    const topKeywords = new Set(Object.keys(wordFrequencies)
        .sort((a, b) => wordFrequencies[b] - wordFrequencies[a])
        .slice(0, Math.max(5, Math.floor(sentences.length / 5)))
    );
    
    // 3. Advanced Sentence Scoring
    const scoredSentences = sentences.map((sentence, index) => {
        const sentenceWords = new Set((sentence.toLowerCase().match(/\b(\w+)\b/g) || []));
        
        // Thematic Score: How many top keywords are in the sentence, weighted by their frequency.
        let thematicScore = 0;
        sentenceWords.forEach(word => {
            if (topKeywords.has(word)) {
                thematicScore += wordFrequencies[word];
            }
        });
        
        // Positional Bonus: First and last sentences are often more important.
        let positionalBonus = 1.0;
        if (index === 0) positionalBonus = 1.5;
        if (index === sentences.length - 1) positionalBonus = 1.2;

        // Length Penalty: Penalize very short, likely uninformative sentences.
        const lengthPenalty = sentenceWords.size < 5 ? 0.5 : 1.0;

        const score = (thematicScore * positionalBonus) * lengthPenalty;

        return { text: sentence.trim(), score, index };
    });

    // 4. Summary Construction (Greedy approach)
    const rankedSentences = scoredSentences.sort((a, b) => b.score - b.score);

    let summarySentences: { text: string; score: number; index: number }[] = [];
    let currentLength = 0;

    for (const sentence of rankedSentences) {
        if (currentLength + sentence.text.length + 1 <= maxLength) {
            summarySentences.push(sentence);
            currentLength += sentence.text.length + 1; // +1 for space
        } else if (summarySentences.length === 0) {
             // If the very first sentence is too long, truncate it.
             summarySentences.push({
                ...sentence,
                text: sentence.text.slice(0, maxLength - 3) + '...'
             });
             break;
        }
    }

    // Re-order them chronologically and join
    const finalSummary = summarySentences
        .sort((a, b) => a.index - b.index)
        .map(s => s.text)
        .join(' ');
        
    return finalSummary || cleanedText.slice(0, maxLength - 3) + '...'; // Fallback
};

/**
 * Generates summaries for a user/AI message pair using the intelligent summarization logic.
 * @param userContent The user's message content.
 * @param aiContent The AI's message content.
 * @returns A promise resolving to an object with user and AI summaries.
 */
const generateSummariesForPair = async (userContent: string, aiContent: string): Promise<{ userSummary: string; aiSummary: string }> => {
    if (!userContent && !aiContent) {
        return { userSummary: "User sent an attachment.", aiSummary: "AI responded." };
    }

    const userSummary = intelligentSummary(userContent, 120) || "User provided context or an attachment.";
    const aiSummary = intelligentSummary(aiContent, 250) || "AI provided a response.";

    return { userSummary, aiSummary };
};


const processQueue = async () => {
    if (isProcessing || taskQueue.length === 0) return;

    isProcessing = true;
    const task = taskQueue.shift();

    if (task && updateConversationCallback) {
        try {
            const { userSummary, aiSummary } = await generateSummariesForPair(
                task.userMessage.content,
                task.modelMessage.content
            );

            const newContextItem: PlannerContextItem = {
                id: task.modelMessage.id,
                serialNumber: 0, // This will be set in the updater
                userSummary,
                aiSummary,
            };

            updateConversationCallback(task.conversationId, (convo) => {
                const existingContext = convo.plannerContext || [];
                // Add the new item, limit to 5, and re-assign serial numbers
                const updatedContext = [newContextItem, ...existingContext].slice(0, 5)
                    .map((item, index) => ({ ...item, serialNumber: index + 1 }));
                
                // Log the entire updated context to the dev console in a more readable format
                const contextLog = updatedContext.map(item => {
                    const turnLabel = item.serialNumber === 1 
                        ? `**Turn ${item.serialNumber} (Most Recent)**` 
                        : `**Turn ${item.serialNumber}**`;
                    
                    return `${turnLabel}\n- **User:** "${item.userSummary}"\n- **AI:** "${item.aiSummary}"`;
                }).join('\n\n');

                const logMessage = `**Planner Context Updated**\n\n${contextLog}`;
                appLogger.log(logMessage);

                return {
                    ...convo,
                    plannerContext: updatedContext,
                };
            });

        } catch (error) {
            appLogger.error("[Summarizer] Failed to process summarization task:", error);
        }
    }

    isProcessing = false;
    setTimeout(processQueue, 1000);
};

export const initializeSummarizer = (updateFn: UpdateConversationFn) => {
    if (updateConversationCallback) return;
    updateConversationCallback = updateFn;
    setInterval(() => {
        if (!isProcessing) {
            processQueue();
        }
    }, 2000);
};

export const queueSummarizationTasks = (
    userMessage: ChatMessage,
    modelMessage: ChatMessage,
    conversationId: string
) => {
    if ((userMessage.content && userMessage.content.trim()) || userMessage.images || (modelMessage.content && modelMessage.content.trim())) {
        taskQueue.push({ userMessage, modelMessage, conversationId });
    }
};
