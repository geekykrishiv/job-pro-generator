import { ANTHROPIC_CONFIG } from "@/config/anthropic";

export function resolveAnthropicKey(userKey?: string): string {
  const trimmed = userKey?.trim();
  if (trimmed) return trimmed;
  const fromEnv = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim();
  return fromEnv ?? "";
}

interface AnthropicMessageResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
}

/**
 * Calls Anthropic Messages API (Claude Sonnet 4).
 */
export async function callClaude(
  apiKey: string,
  prompt: string,
  system?: string,
): Promise<string> {
  const key = resolveAnthropicKey(apiKey);
  if (!key) {
    throw new Error(
      "Missing Anthropic API key. Add it in Settings or set VITE_ANTHROPIC_API_KEY in .env.local.",
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": ANTHROPIC_CONFIG.API_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: ANTHROPIC_CONFIG.MODEL,
      max_tokens: ANTHROPIC_CONFIG.MAX_TOKENS,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const body = (await response.json()) as AnthropicMessageResponse;

  if (!response.ok) {
    const detail = body.error?.message ?? response.statusText;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Anthropic API rejected the API key (${response.status}). Check your key in Settings.`);
    }
    throw new Error(`Anthropic request failed (${response.status}): ${detail}`);
  }

  const text = body.content?.find((b) => b.type === "text")?.text ?? "";
  return text;
}
