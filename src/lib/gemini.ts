import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN, type GeminiGenerationConfig } from "@/config/gemini";
import { resolveGeminiKey } from "./geminiKey";

/** Extract HTTP status code from Gemini SDK errors. */
function extractGeminiHttpStatus(error: unknown): number | undefined {
  const msg = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(msg) as { error?: { code?: number }; code?: number };
    const code = parsed?.error?.code ?? parsed?.code;
    if (typeof code === "number") return code;
  } catch {
    /* not JSON */
  }
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.status === "number") return e.status;
    if (typeof e.code === "number" && (e.code as number) >= 400) return e.code as number;
  }
  for (const code of [503, 429, 502, 500, 404, 401, 403]) {
    if (new RegExp(`\\b${code}\\b`).test(msg)) return code;
  }
  return undefined;
}

function isRetryable(error: unknown): boolean {
  const status = extractGeminiHttpStatus(error);
  if (status === 401 || status === 403) return false;
  if (status === 503 || status === 429 || status === 500 || status === 502 || status === 404) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /high demand|overloaded|temporarily unavailable|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(msg);
}

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
 * Calls Gemini with automatic model fallback on 503/overload errors.
 * Tries: gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite
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

  const chain = GEMINI_MODEL_CHAIN;
  for (let i = 0; i < chain.length; i++) {
    const modelName = chain[i];
    try {
      const text = await generateGeminiText(apiKey, modelName, prompt, generationConfig);
      if (!text) throw new Error("Gemini returned an empty response.");
      return text;
    } catch (error: unknown) {
      console.error(`[Gemini] Error with model ${modelName}:`, error);

      const status = extractGeminiHttpStatus(error);
      if (status === 401 || status === 403) {
        throw new Error(
          `Gemini API rejected the API key (${status}). Get a free key at aistudio.google.com/apikey`,
        );
      }

      if (!isRetryable(error) || i === chain.length - 1) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Gemini failed after trying: ${chain.slice(0, i + 1).join(", ")}. Last error: ${detail}`,
        );
      }

      console.warn(`[Gemini] ${modelName} failed (${status ?? "retryable"}). Trying ${chain[i + 1]}...`);
    }
  }

  throw new Error("No Gemini models configured.");
}
