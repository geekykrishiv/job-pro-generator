/**
 * Google AI Studio / Gemini API keys.
 * Accepts both legacy AIza... format and the new AQ. prefix format.
 */
export function isGeminiApiKey(key: string | undefined | null): boolean {
  const k = key?.trim() ?? "";
  // Legacy format: AIza... (39 chars total)
  // New AI Studio format: AQ.<base64url-chars>
  return k.startsWith("AIza") || /^AQ\.[A-Za-z0-9_\-]{10,}$/.test(k);
}

/** User Settings key, then GEMINI_API_KEY / VITE_GEMINI_API_KEY from .env.local */
export function resolveGeminiKey(userKey?: string): string {
  const trimmed = userKey?.trim();
  if (trimmed && isGeminiApiKey(trimmed)) return trimmed;

  const env = import.meta.env as ImportMetaEnv;
  const fromEnv = env.GEMINI_API_KEY?.trim() || env.VITE_GEMINI_API_KEY?.trim();
  if (fromEnv && isGeminiApiKey(fromEnv)) return fromEnv;

  return "";
}
