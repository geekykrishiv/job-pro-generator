export const GEMINI_CONFIG = {
  /** Best balance of quality, speed, and free-tier quota on AI Studio. */
  PRIMARY_MODEL: "gemini-2.5-flash",

  /** Higher-quality fallback when Flash is rate-limited or unavailable. */
  FALLBACK_MODELS: ["gemini-2.5-pro", "gemini-2.0-flash"] as const,

  DEFAULT_CONFIG: {
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  },

  /** Stricter for LaTeX generation — fewer syntax mistakes, less hallucination. */
  GENERATION_CONFIG: {
    temperature: 0.35,
    topP: 0.9,
    topK: 40,
    maxOutputTokens: 8192,
  },

  /** Deterministic JSON for ATS scoring. */
  SCORING_CONFIG: {
    temperature: 0.1,
    topP: 0.8,
    topK: 20,
    maxOutputTokens: 2048,
  },
} as const;

export const GEMINI_MODEL_CHAIN: readonly string[] = Array.from(
  new Set<string>([GEMINI_CONFIG.PRIMARY_MODEL, ...GEMINI_CONFIG.FALLBACK_MODELS]),
);
