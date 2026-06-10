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
      systemInstruction: RESUME_WRITER_SYSTEM_INSTRUCTION,
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
