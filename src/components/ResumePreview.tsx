import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, Eye, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compileLatex } from "@/lib/latexCompiler";
import CompilationError from "./CompilationError";

import type { ATSScoreResult } from "@/types";
import ATSBadge from "./ATSBadge";

type PreviewState = "idle" | "loading" | "success" | "error";

interface Props {
  latex: string;
  compileTrigger: number;  // Increment to trigger a new compilation
  atsScore?: ATSScoreResult | null;
}

export default function ResumePreview({ latex, compileTrigger, atsScore }: Props) {
  const [state, setState] = useState<PreviewState>("idle");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [errorLog, setErrorLog] = useState<string | undefined>();
  const prevUrlRef = useRef<string | null>(null);

  // Revoke previous blob URL to avoid memory leaks
  const revokePrevUrl = useCallback(() => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
  }, []);

  // Compile when trigger changes (and is > 0)
  useEffect(() => {
    if (compileTrigger === 0) return;
    if (!latex.trim()) {
      setState("idle");
      return;
    }

    let cancelled = false;
    setState("loading");
    setError("");
    setErrorLog(undefined);

    (async () => {
      const result = await compileLatex(latex);
      if (cancelled) return;

      if (result.pdfBlob) {
        const url = URL.createObjectURL(result.pdfBlob);
        revokePrevUrl();
        prevUrlRef.current = url;
        setPdfUrl(url);
        setState("success");
      } else {
        setState("error");
        setError("Compilation failed");
        setErrorLog(result.errorLog);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [compileTrigger]);

  // Cleanup on unmount
  useEffect(() => revokePrevUrl, []);

  // Manual retry
  const handleRetry = () => {
    if (!latex.trim()) return;
    setState("loading");
    setError("");
    setErrorLog(undefined);

    compileLatex(latex).then((result) => {
      if (result.pdfBlob) {
        const url = URL.createObjectURL(result.pdfBlob);
        revokePrevUrl();
        prevUrlRef.current = url;
        setPdfUrl(url);
        setState("success");
      } else {
        setState("error");
        setError("Compilation failed");
        setErrorLog(result.errorLog);
      }
    });
  };

  // ─── Idle ──────────────────────────────────────────────────────────────
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Eye className="h-8 w-8 text-primary/50" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {latex.trim() ? "Click Compile to preview your resume" : "No LaTeX code yet"}
          </p>
          <p className="text-xs text-muted-foreground/60">
            {latex.trim()
              ? "The LaTeX source will be compiled into a real PDF"
              : "Generate or paste LaTeX code, then compile to preview"}
          </p>
        </div>
        {latex.trim() && (
          <Button onClick={handleRetry} size="sm" className="gap-2">
            <Play className="h-3.5 w-3.5" />
            Compile Now
          </Button>
        )}
      </div>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Compiling LaTeX…</p>
          <p className="text-xs text-muted-foreground">
            Running pdflatex — this may take a few seconds
          </p>
        </div>
      </div>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────
  if (state === "error") {
    return <CompilationError error={error} log={errorLog} onRetry={handleRetry} />;
  }

  // ─── Success: PDF Viewer ───────────────────────────────────────────────
  return (
    <div className="h-full w-full bg-[#525659] relative">
      {atsScore && (
        <div className="absolute top-4 right-6 z-10 shadow-lg">
          <ATSBadge score={atsScore.score} className="text-sm px-3 py-1 shadow-md border border-black/10" />
        </div>
      )}
      <iframe
        src={pdfUrl!}
        title="Resume PDF Preview"
        className="w-full h-full border-none"
        style={{ minHeight: "100%" }}
      />
    </div>
  );
}
