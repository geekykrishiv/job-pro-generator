import type { VercelRequest, VercelResponse } from "@vercel/node";
import { TarArchive } from "archiver";

/**
 * GET compile — fine for short sources; long query strings hit nginx 414.
 * @see https://github.com/aslushnikov/latex-online/issues/78
 */
const LATEX_ONLINE_COMPILE_URL = "https://latexonline.cc/compile";
const LATEX_ONLINE_DATA_URL = "https://latexonline.cc/data";
const DEFAULT_TEX_TARGET = "resume.tex";
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

/** Calls LaTeX.Online: GET ?text= when safe; otherwise POST tarball to /data (avoids 414). */
export async function compileViaLatexOnline(latex: string): Promise<Response> {
  if (compileGetUriByteLength(latex) <= MAX_SAFE_GET_URI_BYTES) {
    const res = await compileViaGet(latex);
    if (res.status !== 414) {
      return res;
    }
  }
  return compileViaTarUpload(latex);
}

function getLatexFromRequest(req: VercelRequest): string | undefined {
  const body = req.body;
  if (body && typeof body === "object" && "latex" in body && typeof (body as { latex: unknown }).latex === "string") {
    return (body as { latex: string }).latex;
  }
  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as { latex?: unknown };
      if (typeof parsed.latex === "string") return parsed.latex;
    } catch {
      /* ignore */
    }
  }
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const latex = getLatexFromRequest(req);
  if (latex === undefined) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(400).send("Missing JSON body with field: latex (string)");
  }

  try {
    const upstreamResponse = await compileViaLatexOnline(latex);
    const upstreamContentType = upstreamResponse.headers.get("content-type") ?? "";
    const pdfBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    if (upstreamResponse.ok && upstreamContentType.includes("application/pdf")) {
      res.setHeader("Content-Type", "application/pdf");
      return res.status(200).send(pdfBuffer);
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    const status =
      upstreamResponse.status >= 400 ? upstreamResponse.status : 502;
    return res.status(status).send(pdfBuffer.toString("utf8"));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
