import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import latexCompileDevProxy from "./vite-plugin-latex-compile";


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  envPrefix: ["VITE_", "GEMINI_"],
  server: {
    host: "localhost",    // must match Firebase API key referrer restriction (localhost)
    cors: false,          // mitigate GHSA-67mh-4wv8-2f99 (esbuild CORS bypass)
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    latexCompileDevProxy(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  assetsInclude: ["**/*.keep"],
}));
