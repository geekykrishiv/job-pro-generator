export const ANTHROPIC_CONFIG = {
  /** Primary model (active). */
  MODEL: "claude-sonnet-4-6",
  /** Fallback if primary is unavailable on the account. */
  FALLBACK_MODELS: ["claude-sonnet-4-5-20250929", "claude-sonnet-4-20250514"] as const,
  API_VERSION: "2023-06-01",
  MAX_TOKENS: 8192,
} as const;
