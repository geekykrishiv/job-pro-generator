import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getProject, updateProject, getMasterResume, getUserSettings } from "@/lib/resumeStore";
import { callGemini } from "@/lib/gemini";
import type { ResumeProject, MasterResume } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Send, Copy, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import LatexPreview from "@/components/LatexPreview";

const SYSTEM_PROMPT = `You are an expert resume writer. Given a candidate's master resume (JSON) and a job description, produce a complete tailored resume in LaTeX using the article class. Output ONLY a single LaTeX document inside a \`\`\`latex code fence. Use clean, ATS-friendly typography (no exotic packages). Include sections relevant to the job. Be concise and quantified.`;

function extractLatex(text: string): string | null {
  const m = text.match(/```(?:latex|tex)?\s*([\s\S]*?)```/);
  return m ? m[1].trim() : null;
}

export default function ProjectView() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<ResumeProject | null>(null);
  const [master, setMaster] = useState<MasterResume | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const [p, m, s] = await Promise.all([
        getProject(user.uid, id),
        getMasterResume(user.uid),
        getUserSettings(user.uid),
      ]);
      setProject(p);
      setMaster(m);
      setApiKey(s.geminiKey ?? "");
    })();
  }, [user?.uid, id]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [project?.chatHistory.length]);

  if (!project) return <div className="p-8 text-muted-foreground">Loading project...</div>;

  const send = async () => {
    if (!input.trim() || !user) return;
    if (!apiKey) {
      toast.error("Add your Gemini API key in Settings.");
      return;
    }
    if (!master) {
      toast.error("Fill out your Master Resume first.");
      return;
    }
    const userMsg = { role: "user" as const, content: input, timestamp: Date.now() };
    const newHistory = [...project.chatHistory, userMsg];
    const isFirst = project.chatHistory.length === 0;
    const jobDescription = isFirst ? input : project.jobDescription;

    setProject({ ...project, chatHistory: newHistory, jobDescription });
    setInput("");
    setBusy(true);

    try {
      const prompt = `MASTER RESUME (JSON):\n${JSON.stringify(master, null, 2)}\n\nJOB DESCRIPTION:\n${jobDescription}\n\nCHAT SO FAR:\n${newHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nProduce the tailored resume in LaTeX now.`;
      const reply = await callGemini(apiKey, prompt, SYSTEM_PROMPT);
      const latex = extractLatex(reply) ?? project.currentLatex;
      const assistantMsg = { role: "assistant" as const, content: reply, timestamp: Date.now() };
      const updated: ResumeProject = {
        ...project,
        chatHistory: [...newHistory, assistantMsg],
        jobDescription,
        currentLatex: latex,
        versions: latex !== project.currentLatex
          ? [...project.versions, { id: crypto.randomUUID(), latex, createdAt: Date.now() }]
          : project.versions,
      };
      setProject(updated);
      await updateProject(user.uid, project.id, {
        chatHistory: updated.chatHistory,
        jobDescription: updated.jobDescription,
        currentLatex: updated.currentLatex,
        versions: updated.versions,
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setLatex = async (latex: string) => {
    if (!user) return;
    setProject({ ...project, currentLatex: latex });
    await updateProject(user.uid, project.id, { currentLatex: latex });
  };

  const saveVersion = async () => {
    if (!user) return;
    const versions = [...project.versions, { id: crypto.randomUUID(), latex: project.currentLatex, createdAt: Date.now(), label: `v${project.versions.length + 1}` }];
    setProject({ ...project, versions });
    await updateProject(user.uid, project.id, { versions });
    toast.success("Version saved");
  };

  const copyLatex = async () => {
    await navigator.clipboard.writeText(project.currentLatex);
    toast.success("LaTeX copied");
  };

  const downloadPdf = () => {
    window.print();
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen">
      <ResizablePanel defaultSize={35} minSize={25}>
        <div className="h-full flex flex-col border-r border-border">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-medium">{project.name}</h2>
            <p className="text-xs text-muted-foreground truncate">
              {project.jobDescription ? project.jobDescription.slice(0, 80) + "..." : "Paste a job description to begin"}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {project.chatHistory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Paste a job description below to generate your first tailored resume.
              </p>
            )}
            {project.chatHistory.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "" : "bg-muted"} rounded-lg p-3`}>
                <div className="text-xs text-muted-foreground mb-1">{m.role}</div>
                <div className="whitespace-pre-wrap">{m.content.slice(0, 600)}{m.content.length > 600 ? "..." : ""}</div>
              </div>
            ))}
            {busy && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Generating...</div>}
            <div ref={chatEnd} />
          </div>
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={project.chatHistory.length === 0 ? "Paste job description..." : "Ask for tweaks..."}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                }}
              />
              <Button onClick={send} disabled={busy} size="icon">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">⌘+Enter to send</p>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      <ResizablePanel defaultSize={65}>
        <div className="h-full flex flex-col">
          <div className="px-4 py-2 border-b border-border flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyLatex}><Copy className="h-3 w-3 mr-1" />Copy LaTeX</Button>
            <Button size="sm" variant="outline" onClick={saveVersion}><Save className="h-3 w-3 mr-1" />Save Version</Button>
            <Button size="sm" variant="outline" onClick={downloadPdf}>Download PDF</Button>
            <span className="text-xs text-muted-foreground ml-auto">{project.versions.length} versions</span>
          </div>
          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2 self-start">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="editor">LaTeX</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" className="flex-1 overflow-y-auto p-6 m-0">
              <LatexPreview latex={project.currentLatex} />
            </TabsContent>
            <TabsContent value="editor" className="flex-1 m-0 p-0">
              <Textarea
                className="h-full w-full rounded-none border-0 font-mono text-xs resize-none"
                value={project.currentLatex}
                onChange={(e) => setLatex(e.target.value)}
                placeholder="Generated LaTeX will appear here."
              />
            </TabsContent>
          </Tabs>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
