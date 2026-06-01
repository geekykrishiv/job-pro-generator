import { GoogleGenerativeAI, type GenerationConfig } from "@google/generative-ai";
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN } from "@/config/gemini";
import { resolveGeminiKey } from "./geminiKey";

/** HTTP-style status from SDK errors, including JSON bodies embedded in `message`. */
export function extractGeminiHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.status === "number") return e.status;
    const code = e.code;
    if (typeof code === "number" && code >= 400 && code < 600) return code;
  }

  const msg = error instanceof Error ? error.message : String(error);
  try {
    const parsed = JSON.parse(msg) as { error?: { code?: number }; code?: number };
    const code = parsed?.error?.code ?? parsed?.code;
    if (typeof code === "number") return code;
  } catch {
    /* not JSON */
  }

  const quoted = msg.match(/"code"\s*:\s*(\d{3})/);
  if (quoted) return parseInt(quoted[1], 10);
  if (/\b429\b/.test(msg)) return 429;
  if (/not\s+found|is\s+not\s+found/i.test(msg)) return 404;
  return undefined;
}

export function isRetryableGeminiError(error: unknown): boolean {
  const status = extractGeminiHttpStatus(error);
  if (status === 401 || status === 403) return false;
  if (status === 404 || status === 429) return true;
  const msg = error instanceof Error ? error.message : String(error);
  if (/RESOURCE_EXHAUSTED|quota|rate\s*limit/i.test(msg)) return true;
  if (/not\s+found|is\s+not\s+found/i.test(msg)) return true;
  return false;
}

function formatGeminiFailure(modelsTried: readonly string[], error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return `Gemini request failed after trying: ${modelsTried.join(", ")}. Last error: ${detail}`;
}

export async function generateGeminiText(
  apiKey: string,
  modelName: string,
  prompt: string,
  generationConfig?: GenerationConfig,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig,
  });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Calls Google AI Studio (Gemini) with a single combined prompt string.
 * Tries PRIMARY_MODEL then fallbacks on retryable errors.
 */
export async function callGemini(
  userApiKey: string,
  prompt: string,
  generationConfig: GenerationConfig = GEMINI_CONFIG.GENERATION_CONFIG,
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
      return await generateGeminiText(apiKey, modelName, prompt, generationConfig);
    } catch (error: unknown) {
      console.error(`[Gemini] Error with model ${modelName}:`, error);

      const status = extractGeminiHttpStatus(error);
      if (status === 401 || status === 403) {
        throw new Error(
          `Gemini API rejected the API key (${status}). Get a free key at aistudio.google.com/apikey`,
        );
      }

      if (!isRetryableGeminiError(error)) {
        throw new Error(formatGeminiFailure(chain.slice(0, i + 1), error));
      }

      if (i < chain.length - 1) {
        console.warn(`[Gemini] ${modelName} failed. Trying ${chain[i + 1]}...`);
        continue;
      }

      throw new Error(formatGeminiFailure(chain, error));
    }
  }

  throw new Error("No Gemini models configured.");
}
