import { ANTHROPIC_CONFIG, ANTHROPIC_MODEL_CHAIN } from "@/config/anthropic";
import { isAnthropicApiKey, isGeminiApiKey } from "./anthropicKey";

export function resolveAnthropicKey(userKey?: string): string {
  const trimmed = userKey?.trim();
  if (trimmed) {
    if (isGeminiApiKey(trimmed)) {
      return "";
    }
    if (isAnthropicApiKey(trimmed)) {
      return trimmed;
    }
  }
  const fromEnv = import.meta.env.VITE_ANTHROPIC_API_KEY?.trim();
  if (fromEnv && isAnthropicApiKey(fromEnv) && !isGeminiApiKey(fromEnv)) {
    return fromEnv;
  }
  return "";
}

interface AnthropicErrorBody {
  type?: string;
  error?: { type?: string; message?: string };
}

interface AnthropicMessageResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { type?: string; message?: string };
}

function parseAnthropicError(body: AnthropicErrorBody, status: number): string {
  const msg = body.error?.message?.trim();
  if (msg && msg !== "Error") return msg;
  if (status === 401) {
    return "Invalid API key. Create a new sk-ant-... key at console.anthropic.com and save it in Settings.";
  }
  if (status === 400) {
    return "Bad request — often an unsupported model for your API key. The app will try fallback models automatically.";
  }
  return `HTTP ${status}`;
}

/** True when we should try the next model in the chain. */
function shouldTryNextModel(status: number, body: AnthropicErrorBody): boolean {
  if (status === 404) return true;
  if (status !== 400) return false;
  const type = body.error?.type ?? "";
  const msg = (body.error?.message ?? "").toLowerCase();
  if (type === "invalid_request_error" && (!msg || msg === "error")) {
    return true;
  }
  return (
    msg.includes("model") ||
    msg.includes("identifier") ||
    msg.includes("not found") ||
    msg.includes("does not exist")
  );
}

async function anthropicMessagesRequest(
  apiKey: string,
  model: string,
  prompt: string,
  system?: string,
  maxTokens = ANTHROPIC_CONFIG.MAX_TOKENS,
): Promise<Response> {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_CONFIG.API_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: prompt }],
    }),
  });
}

export interface ValidateAnthropicKeyResult {
  valid: boolean;
  error?: string;
}

/** Validates key format and calls the Messages API (tries primary + fallbacks). */
export async function validateAnthropicKeyDetailed(apiKey: string): Promise<ValidateAnthropicKeyResult> {
  const key = apiKey.trim();
  if (!key) {
    return { valid: false, error: "No API key entered." };
  }
  if (isGeminiApiKey(key)) {
    return {
      valid: false,
      error: "This is a Google Gemini key (AIza...). Add an Anthropic key (sk-ant-...) from console.anthropic.com.",
    };
  }
  if (!isAnthropicApiKey(key)) {
    return {
      valid: false,
      error: "Key must start with sk-ant- (from console.anthropic.com → API keys).",
    };
  }

  let lastError = "Unknown error";

  for (let i = 0; i < ANTHROPIC_MODEL_CHAIN.length; i++) {
    const model = ANTHROPIC_MODEL_CHAIN[i];
    try {
      const response = await anthropicMessagesRequest(key, model, "Reply with OK only.", undefined, 16);
      const body = (await response.json()) as AnthropicMessageResponse & AnthropicErrorBody;

      if (response.ok) {
        return { valid: true };
      }

      lastError = `${model}: ${parseAnthropicError(body, response.status)}`;
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: lastError };
      }
      if (shouldTryNextModel(response.status, body) && i < ANTHROPIC_MODEL_CHAIN.length - 1) {
        continue;
      }
      return { valid: false, error: lastError };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  return { valid: false, error: lastError };
}

/**
 * Calls Anthropic Messages API (Claude Sonnet).
 */
export async function callClaude(
  apiKey: string,
  prompt: string,
  system?: string,
): Promise<string> {
  const key = resolveAnthropicKey(apiKey);
  if (!key) {
    if (isGeminiApiKey(apiKey)) {
      throw new Error(
        "A Google Gemini key (AIza...) is stored. Replace it with an Anthropic key (sk-ant-...) in Settings.",
      );
    }
    throw new Error(
      "Missing Anthropic API key. Add sk-ant-... in Settings or set VITE_ANTHROPIC_API_KEY in .env.local.",
    );
  }

  let lastError = "Anthropic request failed";

  for (let i = 0; i < ANTHROPIC_MODEL_CHAIN.length; i++) {
    const model = ANTHROPIC_MODEL_CHAIN[i];
    const response = await anthropicMessagesRequest(key, model, prompt, system);
    const body = (await response.json()) as AnthropicMessageResponse & AnthropicErrorBody;

    if (response.ok) {
      return body.content?.find((b) => b.type === "text")?.text ?? "";
    }

    lastError = `${model}: ${parseAnthropicError(body, response.status)}`;

    if (response.status === 401 || response.status === 403) {
      throw new Error(`Anthropic API rejected the API key: ${lastError}`);
    }

    if (shouldTryNextModel(response.status, body) && i < ANTHROPIC_MODEL_CHAIN.length - 1) {
      console.warn(`[Anthropic] ${model} failed (${response.status}), trying ${ANTHROPIC_MODEL_CHAIN[i + 1]}...`);
      continue;
    }

    throw new Error(`Anthropic request failed (${response.status}): ${lastError}`);
  }

  throw new Error(lastError);
}
