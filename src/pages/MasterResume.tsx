import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMasterLatexResume, saveMasterLatexResume } from "@/lib/resumeStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Save,
  Upload,
  Code,
  Eye,
  Columns,
  FileText,
  Check,
  Loader2,
  ClipboardPaste,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import ResumePreview from "@/components/ResumePreview";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { MasterLatexResume } from "@/types";

type ViewMode = "split" | "code" | "preview";

export default function MasterResumePage() {
  const { user } = useAuth();
  const [latexCode, setLatexCode] = useState("");
  const [title, setTitle] = useState("My Master Resume");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [compileTrigger, setCompileTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getMasterLatexResume(user.uid)
      .then((data) => {
        if (data) {
          setLatexCode(data.latexCode);
          setTitle(data.title || "My Master Resume");
        }
      })
      .catch(() => {
        // New user, no doc yet — that's fine
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const save = async () => {
    if (!user?.uid) {
      console.error('No authenticated user — cannot write to Firestore');
      return;
    }
    setSaving(true);
    try {
      const resume: MasterLatexResume = {
        latexCode,
        title,
        updatedAt: Date.now(),
      };
      await saveMasterLatexResume(user.uid, resume);
      toast.success("Master resume saved!");
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".tex") && !file.name.endsWith(".txt")) {
      toast.error("Please upload a .tex file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setLatexCode(content);
      setTitle(file.name.replace(/\.(tex|txt)$/, ""));
      toast.success(`Loaded ${file.name}`);
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
    // Reset input so the same file can be re-uploaded
    e.target.value = "";
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setLatexCode(text);
        toast.success("Pasted from clipboard");
      }
    } catch {
      toast.error("Unable to read clipboard. Paste manually into the editor.");
    }
  };

  // Tab key support
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newValue = el.value.substring(0, start) + "  " + el.value.substring(end);
      setLatexCode(newValue);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
    // Ctrl+S to save
    if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  };

  const lineCount = latexCode ? latexCode.split("\n").length : 1;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Empty State: No LaTeX yet ────────────────────────────────────────

  if (!latexCode.trim()) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-serif">Master Resume</h1>
            <p className="text-muted-foreground mt-2">
              Upload or paste your LaTeX resume. The AI will tailor versions from this master copy.
            </p>
          </div>

          {/* Title input */}
          <div>
            <Label htmlFor="title">Resume title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Full Stack Developer Resume"
              className="max-w-md"
            />
          </div>

          {/* Upload option */}
          <Card className="p-8 border-dashed border-2 hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Upload .tex file</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag and drop or click to browse. Supports .tex files.
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".tex,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </Card>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Paste option */}
          <Card className="p-8 border-dashed border-2 hover:border-primary/40 transition-colors cursor-pointer group"
            onClick={handlePaste}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <ClipboardPaste className="h-7 w-7 text-violet-500" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Paste LaTeX code</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Click to paste from clipboard, or start typing in the editor below.
                </p>
              </div>
            </div>
          </Card>

          {/* Or just start typing */}
          <div className="bg-[#1e1e2e] rounded-lg overflow-hidden border border-[#313244]">
            <div className="flex items-center justify-between px-3 py-2 bg-[#181825] border-b border-[#313244]">
              <div className="flex items-center gap-2">
                <Code className="h-3.5 w-3.5 text-[#cdd6f4]" />
                <span className="text-xs text-[#cdd6f4] font-medium">master.tex</span>
              </div>
            </div>
            <textarea
              value={latexCode}
              onChange={(e) => setLatexCode(e.target.value)}
              onKeyDown={handleEditorKeyDown}
              placeholder={"% Paste or type your LaTeX resume here...\n\\documentclass[11pt]{article}\n\\begin{document}\n\n% Your resume content\n\n\\end{document}"}
              className="latex-code-editor w-full min-h-[300px] bg-transparent text-[#cdd6f4] font-mono text-[12px] leading-[1.65] p-3 resize-none outline-none border-none caret-[#f5c2e7]"
              spellCheck={false}
            />
          </div>

          <Button onClick={save} disabled={saving || !latexCode.trim()} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Master Resume
          </Button>
        </div>
      </div>
    );
  }

  // ─── Full Editor View (Overleaf-style) ────────────────────────────────

  const renderCodeEditor = () => (
    <div className="h-full flex flex-col bg-[#1e1e2e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-b border-[#313244]">
        <div className="flex items-center gap-2">
          <Code className="h-3.5 w-3.5 text-[#cdd6f4]" />
          <span className="text-xs text-[#cdd6f4] font-medium">master.tex</span>
        </div>
        <span className="text-[10px] text-[#6c7086]">{lineCount} lines</span>
      </div>
      <div className="flex-1 overflow-auto relative">
        <div className="flex min-h-full">
          <div className="select-none shrink-0 bg-[#181825] border-r border-[#313244] px-2 pt-2 pb-4 text-right">
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i} className="text-[11px] leading-[1.65] text-[#6c7086] font-mono">
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            ref={editorRef}
            value={latexCode}
            onChange={(e) => setLatexCode(e.target.value)}
            onKeyDown={handleEditorKeyDown}
            className="latex-code-editor flex-1 min-h-full bg-transparent text-[#cdd6f4] font-mono text-[12px] leading-[1.65] p-2 resize-none outline-none border-none caret-[#f5c2e7] selection:bg-[#45475a]"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="h-full overflow-hidden bg-[#f0f0f0] dark:bg-[#1a1a2e]">
      <ResumePreview latex={latexCode} compileTrigger={compileTrigger} />
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border shrink-0 overflow-x-auto">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-7 w-48 text-xs font-medium border-none bg-transparent px-1 focus-visible:ring-1"
        />

        <div className="w-px h-5 bg-border mx-1" />

        <Button size="sm" onClick={save} disabled={saving} className="h-7 text-xs gap-1.5">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCompileTrigger((c) => c + 1)}
          className="h-7 text-xs gap-1.5"
        >
          <Play className="h-3 w-3" />
          Compile
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="h-7 text-xs gap-1.5"
        >
          <Upload className="h-3 w-3" />
          Upload .tex
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".tex,.txt"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* View mode toggle */}
        <div className="ml-auto hidden md:flex items-center gap-0.5 bg-muted rounded-md p-0.5">
          <button
            onClick={() => setViewMode("code")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "code" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Code only"
          >
            <Code className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("split")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "split" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Split view"
          >
            <Columns className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewMode("preview")}
            className={`p-1.5 rounded transition-colors ${
              viewMode === "preview" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Preview only"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "code" && renderCodeEditor()}
        {viewMode === "preview" && renderPreview()}
        {viewMode === "split" && (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={50} minSize={30}>
              {renderCodeEditor()}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={30}>
              {renderPreview()}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}
