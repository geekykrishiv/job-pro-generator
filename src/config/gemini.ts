export const GEMINI_CONFIG = {
  PRIMARY_MODEL: "gemini-2.5-flash",
  /** Tried in order when primary is overloaded (503) or rate-limited. */
  FALLBACK_MODELS: [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ] as const,

  /** Resume generation — low temperature per AI Studio best practice. */
  GENERATION_CONFIG: {
    temperature: 0.2,
    maxOutputTokens: 8192,
  },

  SCORING_CONFIG: {
    temperature: 0.1,
    maxOutputTokens: 2048,
  },
} as const;

export const GEMINI_MODEL_CHAIN: readonly string[] = Array.from(
  new Set<string>([GEMINI_CONFIG.PRIMARY_MODEL, ...GEMINI_CONFIG.FALLBACK_MODELS]),
);

export type GeminiGenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
};
