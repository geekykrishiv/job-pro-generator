import type { VercelRequest, VercelResponse } from "@vercel/node";
import { compileViaLatexOnline } from "./lib/latexCompileUpstream";

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
