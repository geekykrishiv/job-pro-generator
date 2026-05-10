export const GEMINI_CONFIG = {
  // Primary model to use for all requests
  PRIMARY_MODEL: "gemini-2.0-flash",

  // Fallback chain if the primary model fails (e.g. rate limit, unavailable)
  // We use 1.5-flash as the immediate fallback because 2.5-flash is not yet available in the public API.
  // If 2.5-flash becomes available, it can be added to the front of this array.
  FALLBACK_MODELS: [
    "gemini-2.5-flash",
    "gemini-1.5-flash"
  ],

  // Default generation configuration
  DEFAULT_CONFIG: {
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  }
};
