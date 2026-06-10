import { useState, useEffect, useRef } from 'react';
import { compileLatex, createPdfUrl } from '../../lib/latexCompiler';
import type { ResumeVersion, ATSScoreResult } from "@/types";
import { Loader2, MessageSquare, Download, Play, Save, History, Home } from "lucide-react";
import { Link } from "react-router-dom";
import VersionHistory from "./VersionHistory";

interface Props {
  latex: string;
  projectName: string;
  onLatexChange: (latex: string) => void;
  onSaveVersion: () => void;
  onRegenerate?: () => void;
  versions: ResumeVersion[];
  activeVersionId?: string;
  onRestoreVersion: (versionId: string) => void;
  onDeleteVersion: (versionId: string) => void;
  busy: boolean;
  atsScore?: ATSScoreResult | null;
  onToggleChat: () => void;
}

export default function LatexEditor({
  latex,
  projectName,
  onLatexChange,
  onSaveVersion,
  onRegenerate,
  versions,
  activeVersionId,
  onRestoreVersion,
  onDeleteVersion,
  busy,
  atsScore,
  onToggleChat
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const prevPdfUrl = useRef<string | null>(null);

  // Revoke old blob URL to free memory
  useEffect(() => {
    return () => {
      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
    };
  }, [pdfUrl]);

  // Auto-compile when latex changes (debounce could be added, but for now we require manual compile or compile on mount)
  // Actually, we should compile manually or when explicit compile is requested to save resources.
  // We'll let the user click compile, but maybe compile on first load if we have latex.
  useEffect(() => {
    if (latex && !pdfUrl && !isCompiling && !errorLog) {
      handleCompile();
    }
  }, [latex]);

  async function handleCompile() {
    if (!latex.trim()) return;
    setIsCompiling(true);
    setErrorLog(null);

    const { pdfBlob, errorLog: log, success } = await compileLatex(latex);

    if (success && pdfBlob) {
      if (prevPdfUrl.current) URL.revokeObjectURL(prevPdfUrl.current);
      const url = createPdfUrl(pdfBlob);
      prevPdfUrl.current = url;
      setPdfUrl(url);
      setErrorLog(null);
    } else {
      setErrorLog(log);
    }

    setIsCompiling(false);
  }

  // Handle tab key in editor for indentation
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const value = el.value;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onLatexChange(newValue);
      // Restore cursor position
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] w-full">
      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#2d2d2d] border-b border-[#404040] shrink-0 overflow-x-auto">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-gray-200 hover:bg-[#404040] text-sm rounded shrink-0"
          title="Dashboard"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>

        <span className="text-white font-semibold text-sm truncate max-w-48 shrink-0" title={projectName}>
          {projectName}
        </span>

        <button
          onClick={onToggleChat}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded mr-2 shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          AI Chat
        </button>

        <span className="text-gray-400 text-xs font-mono shrink-0">resume.tex</span>
        
        <div className="flex-1" />
        
        {atsScore && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#404040] text-white text-xs rounded font-medium shrink-0">
            ATS Score: <span className={atsScore.score >= 80 ? "text-green-400" : "text-yellow-400"}>{atsScore.score}/100</span>
          </div>
        )}

        <button
          onClick={() => setShowVersions(!showVersions)}
          className={`flex items-center gap-2 px-3 py-1.5 text-white text-sm rounded shrink-0 ${showVersions ? 'bg-indigo-600' : 'bg-[#404040] hover:bg-[#505050]'}`}
        >
          <History className="w-4 h-4" />
          History
        </button>

        <button
          onClick={onSaveVersion}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#404040] hover:bg-[#505050] text-white text-sm rounded shrink-0"
        >
          <Save className="w-4 h-4" />
          Save
        </button>

        <button
          onClick={handleCompile}
          disabled={isCompiling}
          className="flex items-center gap-2 px-4 py-1.5 bg-green-600 hover:bg-green-500 
                     disabled:opacity-50 text-white text-sm font-medium rounded shrink-0"
        >
          {isCompiling ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Compiling...</>
          ) : (
            <><Play className="w-4 h-4 fill-current" /> Recompile</>
          )}
        </button>
        <button
          onClick={() => pdfUrl && window.open(pdfUrl)}
          disabled={!pdfUrl}
          className="flex items-center gap-2 px-4 py-1.5 bg-[#404040] hover:bg-[#505050]
                     disabled:opacity-40 text-white text-sm rounded shrink-0"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* ── Main Split Panel ── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Version History Sidebar Overlay */}
        {showVersions && (
          <div className="absolute top-0 right-0 bottom-0 w-72 z-20 border-l border-[#404040] bg-[#252526] shadow-xl">
            <VersionHistory
              versions={versions}
              activeVersionId={activeVersionId}
              onRestore={onRestoreVersion}
              onDelete={onDeleteVersion}
              onClose={() => setShowVersions(false)}
            />
          </div>
        )}

        {/* Left: LaTeX Code Editor */}
        <div className="w-1/2 flex flex-col border-r border-[#404040]">
          <div className="px-3 py-1.5 bg-[#252526] text-xs text-gray-400 border-b border-[#404040] flex justify-between">
            <span>Code Editor</span>
            <span>{latex.split('\n').length} lines</span>
          </div>
          <textarea
            value={latex}
            onChange={(e) => onLatexChange(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            className="flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 
                       resize-none outline-none leading-relaxed selection:bg-[#264f78]"
            spellCheck={false}
            placeholder="LaTeX code will appear here after generation..."
          />
        </div>

        {/* Right: PDF Preview */}
        <div className="w-1/2 flex flex-col bg-[#3c3c3c]">
          <div className="px-3 py-1.5 bg-[#252526] text-xs text-gray-400 border-b border-[#404040]">
            PDF Preview
          </div>

          {/* Compilation Error State */}
          {errorLog && (
            <div className="m-4 p-4 bg-red-950/50 border border-red-900 rounded-md text-red-300 text-xs font-mono overflow-auto max-h-48 shadow-lg">
              <p className="font-bold mb-2 text-red-400 flex items-center gap-2">
                <span>⚠</span> Compilation Failed
              </p>
              <pre className="whitespace-pre-wrap">{errorLog}</pre>
            </div>
          )}

          {/* PDF iframe */}
          {pdfUrl && !errorLog ? (
            <iframe
              src={pdfUrl}
              className="flex-1 w-full border-0 bg-white"
              title="Resume Preview"
            />
          ) : !errorLog ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-4">
              <span className="text-6xl opacity-50">📄</span>
              <p className="text-sm font-medium">Click Recompile to preview your resume</p>
              <button
                onClick={handleCompile}
                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                Compile Now
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Bottom: Compiler Log (collapsible) ── */}
      {errorLog && (
        <div className="h-40 bg-[#1e1e1e] border-t border-[#404040] overflow-auto p-4 shadow-inner">
          <p className="text-red-400 text-xs font-mono font-bold mb-2 uppercase tracking-wider">Compiler Log:</p>
          <pre className="text-gray-400 text-xs font-mono whitespace-pre-wrap">{errorLog}</pre>
        </div>
      )}
    </div>
  );
}
