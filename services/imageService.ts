import { GoogleGenAI } from "@google/genai";
import { getAiClient } from "./aiClient";
import { getFriendlyErrorMessage } from "../utils/errorUtils";

/**
 * Generates an image based on a text prompt.
 * @param prompt The text prompt describing the image to generate.
 * @param modelId The optional model ID to use for generation. Defaults to 'imagen-4.0-generate-001'.
 * @returns A base64 encoded string of the generated PNG image.
 */
export const generateImage = async (prompt: string, modelId?: string): Promise<string> => {
    if (!prompt.trim()) {
        throw new Error("Prompt cannot be empty.");
    }
    const ai: GoogleGenAI = getAiClient();
    try {
        const response = await ai.models.generateImages({
            model: modelId || 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/png',
            },
        });

        if (!response.generatedImages || response.generatedImages.length === 0) {
            throw new Error("Image generation failed: The API did not return any images.");
        }

        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return base64ImageBytes;

    } catch (error) {
        console.error("Error generating image:", error);
        const friendlyError = getFriendlyErrorMessage(error);
        throw new Error(friendlyError.message);
    }
};
