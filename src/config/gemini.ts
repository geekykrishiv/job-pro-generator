import type { GenerationConfig } from "@google/generative-ai";

export const GEMINI_CONFIG = {
  PRIMARY_MODEL: "gemini-2.5-flash",
  FALLBACK_MODELS: ["gemini-2.5-pro", "gemini-2.0-flash"] as const,

  /** Resume generation — low temperature per AI Studio best practice. */
  GENERATION_CONFIG: {
    temperature: 0.2,
    maxOutputTokens: 8192,
  } satisfies GenerationConfig,

  SCORING_CONFIG: {
    temperature: 0.1,
    maxOutputTokens: 2048,
  } satisfies GenerationConfig,
} as const;

export const GEMINI_MODEL_CHAIN: readonly string[] = Array.from(
  new Set<string>([GEMINI_CONFIG.PRIMARY_MODEL, ...GEMINI_CONFIG.FALLBACK_MODELS]),
);
