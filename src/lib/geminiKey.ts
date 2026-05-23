/** Google AI Studio / Gemini API keys */
export function isGeminiApiKey(key: string | undefined | null): boolean {
  const k = key?.trim() ?? "";
  return k.startsWith("AIza");
}

export function resolveGeminiKey(userKey?: string): string {
  const trimmed = userKey?.trim();
  if (trimmed && isGeminiApiKey(trimmed)) return trimmed;
  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (fromEnv && isGeminiApiKey(fromEnv)) return fromEnv;
  return "";
}
