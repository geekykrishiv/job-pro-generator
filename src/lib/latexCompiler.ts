const TIMEOUT_MS = 90_000;

export interface CompileResult {
  pdfBlob: Blob | null;
  errorLog: string;
  success: boolean;
}

export async function compileLatex(latex: string): Promise<CompileResult> {
  const formData = new FormData();
  const texFile = new Blob([latex], { type: 'text/plain' });
  formData.append('file', texFile, 'resume.tex');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const COMPILE_URL = import.meta.env.DEV
      ? '/api/latex-compile'          // proxied in dev (bypasses CORS)
      : 'https://latexonline.cc/compile'; // direct in prod (may need backend)

    const response = await fetch(COMPILE_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') ?? '';

    if (response.ok && contentType.includes('application/pdf')) {
      return { pdfBlob: await response.blob(), errorLog: '', success: true };
    }

    const errorText = await response.text();
    return {
      pdfBlob: null,
      errorLog: errorText || `HTTP ${response.status}: Compilation failed`,
      success: false,
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // If CORS blocks the request, fall back to base64 download approach
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return {
        pdfBlob: null,
        errorLog: 'CORS_ERROR: Cannot reach compiler. Please use the Copy LaTeX button and paste into overleaf.com',
        success: false,
      };
    }

    if (err instanceof Error && err.name === 'AbortError') {
      return { pdfBlob: null, errorLog: 'Timed out after 90s.', success: false };
    }
    return { pdfBlob: null, errorLog: String(err), success: false };
  }
}

export function createPdfUrl(pdfBlob: Blob): string {
  return URL.createObjectURL(pdfBlob);
}
