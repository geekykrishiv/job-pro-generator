import type { IncomingMessage } from "node:http";
import type { Plugin, PreviewServer, ViteDevServer } from "vite";

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk as Buffer));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

function latexCompileDevProxy(): Plugin {
  const attach = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use(async (req, res, next) => {
      const path = req.url?.split("?")[0] ?? "";
      if (path !== "/api/latex-compile") {
        return next();
      }

      if (req.method !== "POST") {
        res.statusCode = 405;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Method Not Allowed");
        return;
      }

      let body: unknown;
      try {
        body = await readJsonBody(req);
      } catch (e) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(e instanceof Error ? e.message : "Bad request");
        return;
      }

      const latex =
        body &&
        typeof body === "object" &&
        "latex" in body &&
        typeof (body as { latex: unknown }).latex === "string"
          ? (body as { latex: string }).latex
          : undefined;

      if (latex === undefined) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Missing JSON field: latex (string)");
        return;
      }

      try {
        const { compileViaLatexOnline } = await import("./api/latex-compile.js");
        const upstream = await compileViaLatexOnline(latex);
        const ct = upstream.headers.get("content-type") ?? "";
        const buf = Buffer.from(await upstream.arrayBuffer());

        res.statusCode = upstream.status;
        if (upstream.ok && ct.includes("application/pdf")) {
          res.setHeader("Content-Type", "application/pdf");
          res.end(buf);
          return;
        }
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(buf.toString("utf8"));
      } catch (e) {
        res.statusCode = 502;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(String(e));
      }
    });
  };

  return {
    name: "latex-compile-proxy",
    configureServer(server) {
      attach(server);
    },
    configurePreviewServer(server) {
      attach(server);
    },
  };
}

export default latexCompileDevProxy;
