import { useEffect, useRef } from "react";

interface Props {
  latex: string;
}

export default function LatexPreview({ latex }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!latex.trim()) {
      ref.current.innerHTML = '<p class="text-sm text-muted-foreground">No resume yet. Generate one from the chat.</p>';
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // @ts-ignore - latex.js has no types
        const { HtmlGenerator, parse } = await import("latex.js");
        const generator = new HtmlGenerator({ hyphenate: false });
        const doc = parse(latex, { generator }).htmlDocument();
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = "";
        // import css from latex.js
        const styleLinks = doc.head.querySelectorAll("link, style");
        styleLinks.forEach((s) => ref.current!.appendChild(s.cloneNode(true)));
        ref.current.appendChild(doc.body.cloneNode(true));
      } catch (err: any) {
        if (!ref.current) return;
        ref.current.innerHTML = `<pre class="text-xs text-destructive whitespace-pre-wrap">${err.message ?? "Failed to render LaTeX"}</pre><pre class="text-xs mt-4 whitespace-pre-wrap">${latex}</pre>`;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [latex]);

  return <div ref={ref} className="latex-preview bg-white text-black rounded shadow-sm p-8 min-h-[600px]" />;
}
