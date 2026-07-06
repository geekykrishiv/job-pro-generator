/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Gemini API key — exposed via vite envPrefix "GEMINI_"
  // NOTE: GEMINI_API_KEY is intentionally NOT prefixed VITE_ — it is
  // only safe because it is user-supplied in Settings or .env.local
  // and never baked into the production bundle via hardcoding.
  readonly GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;

  // Firebase — safe to expose (client SDK keys are designed to be public,
  // but should still come from env to avoid accidental rotation issues)
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
