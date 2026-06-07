import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG, type GeminiGenerationConfig } from "@/config/gemini";
import { resolveGeminiKey } from "./geminiKey";

export async function generateGeminiText(
  apiKey: string,
  modelName: string,
  prompt: string,
  generationConfig?: GeminiGenerationConfig,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: generationConfig?.temperature,
      maxOutputTokens: generationConfig?.maxOutputTokens,
    },
  });
  return response.text ?? "";
}

/**
 * Calls Google AI Studio (Gemini) with a single combined prompt string.
 * Uses the single correct model — no fallback chain needed.
 */
export async function callGemini(
  userApiKey: string,
  prompt: string,
  generationConfig: GeminiGenerationConfig = GEMINI_CONFIG.GENERATION_CONFIG,
): Promise<string> {
  const apiKey = resolveGeminiKey(userApiKey);
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Add GEMINI_API_KEY in .env.local or save your key in Settings.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_CONFIG.MODEL,
    contents: prompt,
    config: {
      temperature: generationConfig.temperature,
      maxOutputTokens: generationConfig.maxOutputTokens,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}
