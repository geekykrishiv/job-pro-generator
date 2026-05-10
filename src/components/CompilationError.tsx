import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  error: string;
  log?: string;
  onRetry: () => void;
}

export default function CompilationError({ error, log, onRetry }: Props) {
  const [showLog, setShowLog] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-1.5 max-w-md">
        <h3 className="text-lg font-semibold text-destructive">Compilation Failed</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>

      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Retry Compilation
      </Button>

      {log && (
        <div className="w-full max-w-2xl mt-2">
          <button
            onClick={() => setShowLog(!showLog)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            {showLog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showLog ? "Hide" : "Show"} compiler log
          </button>

          {showLog && (
            <pre className="mt-3 p-4 bg-[#1e1e2e] text-[#cdd6f4] rounded-lg text-[11px] leading-relaxed overflow-auto max-h-72 text-left border border-[#313244] whitespace-pre-wrap break-words">
              {log}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
