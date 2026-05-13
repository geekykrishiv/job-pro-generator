const TIMEOUT_MS = 90_000;

/** Same-origin route: dev/preview middleware + Vercel serverless forward to LaTeX.Online. */
export const LATEX_COMPILE_API = "/api/latex-compile";

export interface CompileResult {
  pdfBlob: Blob | null;
  errorLog: string;
  success: boolean;
}

export async function compileLatex(latex: string): Promise<CompileResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(LATEX_COMPILE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latex }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type") ?? "";

    if (response.ok && contentType.includes("application/pdf")) {
      return { pdfBlob: await response.blob(), errorLog: "", success: true };
    }

    const errorText = await response.text();
    return {
      pdfBlob: null,
      errorLog: errorText || `HTTP ${response.status}: Compilation failed`,
      success: false,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof TypeError && err.message.includes("fetch")) {
      return {
        pdfBlob: null,
        errorLog:
          "CORS_ERROR: Cannot reach compiler. If you use static hosting without /api, deploy to Vercel or run `npm run dev` / `npm run preview`.",
        success: false,
      };
    }

    if (err instanceof Error && err.name === "AbortError") {
      return { pdfBlob: null, errorLog: "Timed out after 90s.", success: false };
    }
    return { pdfBlob: null, errorLog: String(err), success: false };
  }
}

export function createPdfUrl(pdfBlob: Blob): string {
  return URL.createObjectURL(pdfBlob);
}
