/** Google AI Studio / Gemini API keys */
export function isGeminiApiKey(key: string | undefined | null): boolean {
  const k = key?.trim() ?? "";
  return k.startsWith("AIza");
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
