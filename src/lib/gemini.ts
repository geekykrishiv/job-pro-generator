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
 * Calls Gemini directly using the new @google/genai SDK.
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

  return generateGeminiText(
    apiKey,
    GEMINI_CONFIG.PRIMARY_MODEL,
    prompt,
    generationConfig,
  );
}
