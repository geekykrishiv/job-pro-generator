import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG, GEMINI_MODEL_CHAIN } from "@/config/gemini";

/** HTTP-style status from SDK errors, including JSON bodies embedded in `message`. */
export function extractGeminiHttpStatus(error: unknown): number | undefined {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    if (typeof e.status === "number") return e.status;
    const code = e.code;
    if (typeof code === "number" && code >= 400 && code < 600) return code;
    const nested = e.error;
    if (nested && typeof nested === "object") {
      const c = (nested as Record<string, unknown>).code;
      if (typeof c === "number") return c;
    }
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

/** Whether we should try the next model in the chain (not used for auth failures). */
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

/**
 * Calls the Gemini API using the official SDK, walking GEMINI_MODEL_CHAIN on retryable errors.
 */
export async function callGemini(
  apiKey: string,
  prompt: string,
  system?: string,
): Promise<string> {
  if (!apiKey) throw new Error("Missing Gemini API key. Add it in Settings.");

  const ai = new GoogleGenAI({ apiKey });
  const chain = GEMINI_MODEL_CHAIN;
  if (chain.length === 0) {
    throw new Error("No Gemini models configured.");
  }

  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          ...GEMINI_CONFIG.DEFAULT_CONFIG,
          ...(system ? { systemInstruction: system } : {}),
        },
      });

      return response.text ?? "";
    } catch (error: unknown) {
      console.error(`[Gemini] Error with model ${model}:`, error);

      const status = extractGeminiHttpStatus(error);
      if (status === 401 || status === 403) {
        throw new Error(
          `Gemini API rejected the API key (${status}). Check your key in Settings.`,
        );
      }

      if (!isRetryableGeminiError(error)) {
        throw new Error(formatGeminiFailure(chain.slice(0, i + 1), error));
      }

      if (i < chain.length - 1) {
        console.warn(`[Gemini] ${model} failed (${status ?? "retryable"}). Trying ${chain[i + 1]}...`);
        continue;
      }

      throw new Error(formatGeminiFailure(chain, error));
    }
  }
}
