import { TarArchive } from "archiver";

/**
 * GET compile — fine for short sources; long query strings hit nginx 414.
 * @see https://github.com/aslushnikov/latex-online/issues/78
 */
export const LATEX_ONLINE_COMPILE_URL = "https://latexonline.cc/compile";

/**
 * POST multipart tarball (same origin host as GET compile).
 * Note: `.tar.gz` from archiver fails server-side extraction ("failed to extract tarball");
 * uncompressed `.tar` works reliably with their `tar -xf`.
 */
export const LATEX_ONLINE_DATA_URL = "https://latexonline.cc/data";

/** Main TeX file path inside the archive and ?target= value */
export const DEFAULT_TEX_TARGET = "resume.tex";

/**
 * Stay below typical nginx / proxy URI limits (~8k) including encoding overhead.
 */
const MAX_SAFE_GET_URI_BYTES = 6144;

function compileGetUriByteLength(latex: string): number {
  const pathAndQuery = `${LATEX_ONLINE_COMPILE_URL}?text=${encodeURIComponent(latex)}`;
  return Buffer.byteLength(pathAndQuery, "utf8");
}

async function latexToTarBuffer(latex: string, texFileName: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const archive = new TarArchive({
    gzip: false,
  });

  return await new Promise((resolve, reject) => {
    archive.on("warning", (err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") reject(err);
    });
    archive.on("error", reject);
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.append(Buffer.from(latex, "utf8"), { name: texFileName });
    void archive
      .finalize()
      .then(() => resolve(Buffer.concat(chunks)))
      .catch(reject);
  });
}

async function compileViaGet(latex: string): Promise<Response> {
  const url = `${LATEX_ONLINE_COMPILE_URL}?text=${encodeURIComponent(latex)}`;
  return fetch(url, { method: "GET", redirect: "follow" });
}

async function compileViaTarUpload(latex: string): Promise<Response> {
  const tarball = await latexToTarBuffer(latex, DEFAULT_TEX_TARGET);
  const form = new FormData();
  form.append("file", new Blob([tarball]), "bundle.tar");

  const url = new URL(LATEX_ONLINE_DATA_URL);
  url.searchParams.set("target", DEFAULT_TEX_TARGET);
  url.searchParams.set("command", "pdflatex");

  return fetch(url.toString(), {
    method: "POST",
    body: form,
    redirect: "follow",
  });
}

/**
 * Calls LaTeX.Online: GET ?text= when safe; otherwise POST tarball to /data (avoids 414).
 */
export async function compileViaLatexOnline(latex: string): Promise<Response> {
  if (compileGetUriByteLength(latex) <= MAX_SAFE_GET_URI_BYTES) {
    const res = await compileViaGet(latex);
    if (res.status !== 414) {
      return res;
    }
  }
  return compileViaTarUpload(latex);
}
