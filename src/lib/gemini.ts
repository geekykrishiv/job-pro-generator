import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN, type GeminiGenerationConfig } from "@/config/gemini";
import { resolveGeminiKey } from "./geminiKey";

function extractGeminiHttpStatus(error: unknown): number | undefined {
  // 1. Check direct properties from @google/genai ApiError
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.status === "number") return e.status;
    if (typeof e.code === "number" && (e.code as number) >= 400) return e.code as number;
    // Sometimes status is a string
    if (typeof e.status === "string" && /^\d{3}$/.test(e.status)) return parseInt(e.status, 10);
  }
  // 2. Try parsing the error message as JSON (handling prefixes like "ApiError: ")
  const msg = error instanceof Error ? error.message : String(error);
  const jsonStart = msg.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(msg.slice(jsonStart)) as { error?: { code?: number }; code?: number };
      const code = parsed?.error?.code ?? parsed?.code;
      if (typeof code === "number") return code;
    } catch {
      /* not JSON */
    }
  }
  // 3. Regex fallback on the message text
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
  return /high demand|overloaded|temporarily unavailable|UNAVAILABLE|RESOURCE_EXHAUSTED|503/i.test(msg);
}

/** Wait for a given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
 * Calls Gemini with automatic retry + model fallback on 503/overload errors.
 * For each model: retries up to 2 times with 3s delay before falling to next model.
 * Chain: gemini-2.5-flash → gemini-2.0-flash → gemini-2.0-flash-lite
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
  const RETRIES_PER_MODEL = 2;
  const RETRY_DELAY_MS = 3000;

  for (let i = 0; i < chain.length; i++) {
    const modelName = chain[i];

    for (let attempt = 0; attempt <= RETRIES_PER_MODEL; attempt++) {
      try {
        const text = await generateGeminiText(apiKey, modelName, prompt, generationConfig);
        if (!text) throw new Error("Gemini returned an empty response.");
        return text;
      } catch (error: unknown) {
        const status = extractGeminiHttpStatus(error);
        const errMsg = error instanceof Error ? error.message : String(error);

        console.error(`[Gemini] ${modelName} attempt ${attempt + 1} failed (${status ?? "unknown"}):`, errMsg);

        // Non-retryable auth errors → fail immediately
        if (status === 401 || status === 403) {
          throw new Error(
            `Gemini API rejected the API key (${status}). Get a free key at aistudio.google.com/apikey`,
          );
        }

        // Not retryable at all → fail immediately
        if (!isRetryable(error)) {
          throw new Error(`Gemini error: ${errMsg}`);
        }

        // Still have retries left for this model → wait and retry
        if (attempt < RETRIES_PER_MODEL) {
          console.warn(`[Gemini] Retrying ${modelName} in ${RETRY_DELAY_MS}ms...`);
          await delay(RETRY_DELAY_MS);
          continue;
        }

        // Exhausted retries for this model → try next model
        if (i < chain.length - 1) {
          console.warn(`[Gemini] ${modelName} exhausted retries. Falling back to ${chain[i + 1]}...`);
          break; // break inner loop, continue outer loop to next model
        }

        // Last model, last retry → give up
        throw new Error(
          `All Gemini models overloaded (tried: ${chain.join(", ")} with ${RETRIES_PER_MODEL + 1} attempts each). Please try again in a minute.`,
        );
      }
    }
  }

  throw new Error("No Gemini models configured.");
}
