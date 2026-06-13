import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG } from "@/config/gemini";
import { resolveGeminiKey } from "./geminiKey";

/**
 * Calls Gemini strictly using gemini-2.5-flash via the @google/genai SDK.
 * No fallback models. No retry loop.
 */
export async function callGemini(
  userApiKey: string,
  prompt: string,
  generationConfig: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  } = GEMINI_CONFIG.GENERATION_CONFIG,
): Promise<string> {
  const apiKey = resolveGeminiKey(userApiKey);
  if (!apiKey) {
    throw new Error(
      "Missing Gemini API key. Add GEMINI_API_KEY in .env.local or save your key in Settings.",
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_CONFIG.MODEL,
      contents: prompt,
      config: generationConfig,
    });

    const text = response.text;
    if (typeof text === "string") return text;
    // Defensive: if text is undefined for some reason, return empty string
    return "";
  } catch (error: unknown) {
    const status =
      error && typeof error === "object" && "status" in error
        ? (error as Record<string, unknown>).status
        : undefined;

    if (status === 401 || status === 403) {
      throw new Error(
        `Gemini API rejected the API key (${status}). Get a free key at aistudio.google.com/apikey`,
      );
    }

    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Gemini request failed [${GEMINI_CONFIG.MODEL}]: ${detail}`);
  }
}
