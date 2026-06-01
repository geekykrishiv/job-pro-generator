/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google AI Studio key (exposed via vite envPrefix GEMINI_) */
  readonly GEMINI_API_KEY?: string;
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
