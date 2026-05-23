/** Anthropic Console API keys start with sk-ant- */
export function isAnthropicApiKey(key: string | undefined | null): boolean {
  const k = key?.trim() ?? "";
  return k.startsWith("sk-ant-");
}

/** Legacy Google Gemini / AI Studio keys */
export function isGeminiApiKey(key: string | undefined | null): boolean {
  const k = key?.trim() ?? "";
  return k.startsWith("AIza");
}

export interface ResolvedApiKeySettings {
  anthropicKey?: string;
  /** User still has an old Gemini key stored — must replace with sk-ant- */
  hasLegacyGeminiKey: boolean;
}

/**
 * Resolves the Anthropic API key from Firestore user settings.
 * Never returns a Gemini key (that caused 401 Unauthorized on Anthropic).
 */
export function resolveStoredAnthropicKey(data: {
  anthropicKey?: string;
  geminiKey?: string;
} | undefined | null): ResolvedApiKeySettings {
  if (!data) return { hasLegacyGeminiKey: false };

  const anthropic = data.anthropicKey?.trim();
  if (anthropic && isAnthropicApiKey(anthropic)) {
    return { anthropicKey: anthropic, hasLegacyGeminiKey: false };
  }

  // Migration: key was saved under geminiKey before the Claude switch
  const gemini = data.geminiKey?.trim();
  if (gemini && isAnthropicApiKey(gemini)) {
    return { anthropicKey: gemini, hasLegacyGeminiKey: false };
  }

  if (gemini && isGeminiApiKey(gemini)) {
    return { hasLegacyGeminiKey: true };
  }

  return { hasLegacyGeminiKey: false };
}
