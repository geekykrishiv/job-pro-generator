export const GEMINI_CONFIG = {
  MODEL: "gemini-2.5-flash",

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

export type GeminiGenerationConfig = {
  temperature?: number;
  maxOutputTokens?: number;
};
