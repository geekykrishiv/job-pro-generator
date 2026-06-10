import { GoogleGenAI } from "@google/genai";
import { GEMINI_CONFIG, type GeminiGenerationConfig } from "@/config/gemini";
import { resolveGeminiKey } from "./geminiKey";

/**
 * Role-level rules for the model. Passed as `systemInstruction` so the model
 * always enforces these regardless of how the user/task prompt is built.
 */
const RESUME_WRITER_SYSTEM_INSTRUCTION = `You are an expert resume writer. Tailor the provided LaTeX resume to the job description.
RULES:
- Return ONLY valid LaTeX. No markdown, no explanation, no preamble.
- Start with \\documentclass, end with \\end{document}
- ONLY use projects, experience, and skills present in the master resume
- Never invent or add content not in the master resume
- Preserve all LaTeX formatting and commands exactly
- Only reorder or emphasize existing content to match the JD`;

const MAX_TRANSIENT_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY_MS = 1_500;

function isTransientGeminiError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (status === 503) return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return /\b503\b|UNAVAILABLE|high demand|temporarily unavailable/i.test(message);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function generateGeminiText(
  apiKey: string,
  modelName: string,
  prompt: string,
  generationConfig?: GeminiGenerationConfig,
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  for (let attempt = 1; attempt <= MAX_TRANSIENT_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: generationConfig?.temperature,
          maxOutputTokens: generationConfig?.maxOutputTokens,
          systemInstruction: RESUME_WRITER_SYSTEM_INSTRUCTION,
        },
      });
      return response.text ?? "";
    } catch (error) {
      if (!isTransientGeminiError(error) || attempt === MAX_TRANSIENT_ATTEMPTS) {
        if (isTransientGeminiError(error)) {
          throw new Error(
            `Gemini is temporarily unavailable due to high demand after ${MAX_TRANSIENT_ATTEMPTS} attempts. Please try again shortly.`,
          );
        }
        throw error;
      }

      const delayMs = INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        `[job-pro-generator] Gemini temporarily unavailable. Retrying attempt ${attempt + 1}/${MAX_TRANSIENT_ATTEMPTS} in ${delayMs}ms.`,
      );
      await wait(delayMs);
    }
  }

  throw new Error("Gemini request failed unexpectedly.");
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
