import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG } from "@/config/gemini";

/**
 * Calls the Gemini API using the official SDK, with automatic fallback handling.
 */
export async function callGemini(
  apiKey: string,
  prompt: string,
  system?: string,
  targetModel: string = GEMINI_CONFIG.PRIMARY_MODEL
): Promise<string> {
  if (!apiKey) throw new Error("Missing Gemini API key. Add it in Settings.");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: prompt,
      config: {
        ...GEMINI_CONFIG.DEFAULT_CONFIG,
        ...(system ? { systemInstruction: system } : {}),
      },
    });

    return response.text ?? "";
  } catch (error: any) {
    console.error(`[Gemini] Error with model ${targetModel}:`, error);

    // Identify rate limit (429) or model not found (404) to trigger a fallback
    const isRateLimit = error?.status === 429 || error?.message?.includes("429");
    const isModelNotFound = error?.status === 404 || error?.message?.includes("not found");

    if (isRateLimit || isModelNotFound) {
      // Determine next fallback model
      const fallbackIndex = GEMINI_CONFIG.FALLBACK_MODELS.indexOf(targetModel);
      
      // If we used the primary model, start at the first fallback
      let nextModel = "";
      if (targetModel === GEMINI_CONFIG.PRIMARY_MODEL) {
        nextModel = GEMINI_CONFIG.FALLBACK_MODELS[0];
      } 
      // If we are already in the fallback chain, try the next one
      else if (fallbackIndex !== -1 && fallbackIndex < GEMINI_CONFIG.FALLBACK_MODELS.length - 1) {
        nextModel = GEMINI_CONFIG.FALLBACK_MODELS[fallbackIndex + 1];
      }

      if (nextModel) {
        console.warn(`[Gemini] ${targetModel} failed (${isRateLimit ? 'Rate Limit' : 'Not Found'}). Falling back to ${nextModel}...`);
        return callGemini(apiKey, prompt, system, nextModel);
      }
    }

    // If no fallbacks left, or it's a different error (e.g., 400 Bad Request, 403 Forbidden)
    const friendlyMessage = error?.message || "Unknown error occurred while calling Gemini API.";
    throw new Error(friendlyMessage);
  }
}
