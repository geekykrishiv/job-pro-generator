export const GEMINI_CONFIG = {
  /** Default model for generateContent (Gemini API / AI Studio). */
  PRIMARY_MODEL: "gemini-2.0-flash",

  /** Tried in order after PRIMARY_MODEL when the failure is retryable (404 / 429). */
  FALLBACK_MODELS: [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash-lite",
  ],

  DEFAULT_CONFIG: {
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  },
} as const;

/** Ordered list of model IDs to try (primary first, then fallbacks; duplicates removed). */
export const GEMINI_MODEL_CHAIN: readonly string[] = Array.from(
  new Set<string>([GEMINI_CONFIG.PRIMARY_MODEL, ...GEMINI_CONFIG.FALLBACK_MODELS]),
);
