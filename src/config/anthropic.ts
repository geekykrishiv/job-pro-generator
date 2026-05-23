export const ANTHROPIC_CONFIG = {
  /**
   * Dated Sonnet ID — widely available on standard API keys.
   * `claude-sonnet-4-6` can return 400 on some Console keys without extra billing headers.
   */
  MODEL: "claude-sonnet-4-5-20250929",
  FALLBACK_MODELS: [
    "claude-sonnet-4-20250514",
    "claude-haiku-4-5-20251001",
  ] as const,
  API_VERSION: "2023-06-01",
  MAX_TOKENS: 8192,
} as const;

export const ANTHROPIC_MODEL_CHAIN: readonly string[] = [
  ANTHROPIC_CONFIG.MODEL,
  ...ANTHROPIC_CONFIG.FALLBACK_MODELS,
];
