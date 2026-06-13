import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getProject,
  updateProject,
  getMasterLatexResume,
  getUserSettings,
  saveResumeVersion
} from "@/lib/resumeStore";
import { runResumePipeline } from "@/lib/resumePipeline";
import { resolveGeminiKey } from "@/lib/geminiKey";
import { buildTailoredResumePrompt } from "@/lib/resumePrompts";
import type {
  ResumeProject,
  MasterLatexResume,
  ChatMessage,
  ResumeVersion,
  ATSScoreResult,
  GenerationStep
} from "@/types";
import { toast } from "sonner";

interface UseProjectReturn {
  project: ResumeProject | null;
  masterLatex: MasterLatexResume | null;
  apiKey: string;
  loading: boolean;
  busy: boolean;
  stage: string;
  pipelineSteps: GenerationStep[];
  atsScore: ATSScoreResult | null;
  bestScore: number;
  sendMessage: (
    message: string,
    metadata?: { company?: string; targetRole?: string; instructions?: string },
  ) => Promise<void>;
  saveVersion: (label?: string) => Promise<void>;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => Promise<void>;
  updateLatex: (latex: string) => void;
  setProject: React.Dispatch<React.SetStateAction<ResumeProject | null>>;
  clearChatHistory: () => Promise<void>;
}

export function useProject(projectId: string | undefined): UseProjectReturn {
  const { user } = useAuth();
  const [project, setProject] = useState<ResumeProject | null>(null);
  const [masterLatex, setMasterLatex] = useState<MasterLatexResume | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [pipelineSteps, setPipelineSteps] = useState<GenerationStep[]>([]);
  const [atsScore, setAtsScore] = useState<ATSScoreResult | null>(null);
  const [bestScore, setBestScore] = useState(0);

  // Load project data
  useEffect(() => {
    if (!user?.uid || !projectId) return;
    setLoading(true);
    (async () => {
      const [p, m, s] = await Promise.all([
        getProject(user.uid, projectId),
        getMasterLatexResume(user.uid),
        getUserSettings(user.uid),
      ]);
      setProject(p);
      setMasterLatex(m);
      setApiKey(s.geminiKey ?? "");
      setLoading(false);
    })();
  }, [user?.uid, projectId]);

  // Send a message and trigger AI generation
  const sendMessage = useCallback(
    async (
      message: string,
      metadata?: { company?: string; targetRole?: string; instructions?: string },
    ) => {
      if (!message.trim() || !user?.uid || !project) {
        if (!user?.uid) console.error('No authenticated user — cannot write to Firestore');
        return;
      }

      if (!resolveGeminiKey(apiKey)) {
        toast.error("Add your Gemini API key in Settings (free tier at aistudio.google.com).");
        return;
      }

      const freshMaster = await getMasterLatexResume(user.uid);
      const masterLatexCode = freshMaster?.latexCode?.trim() ?? "";
      if (!masterLatexCode) {
        toast.error("Upload your Master LaTeX Resume first.");
        return;
      }

      if (freshMaster) {
        setMasterLatex(freshMaster);
      }

      const newHistory = [...project.chatHistory];
      const isFirstMessage = project.chatHistory.length === 0;

      let jdText = isFirstMessage ? message : project.jobDescription;

      // If refinement, prepend context
      if (!isFirstMessage && project.currentLatex) {
        jdText = `PREVIOUS RESUME LATEX:
${project.currentLatex}

USER REFINEMENT REQUEST:
${message}

ORIGINAL JOB DESCRIPTION:
${project.jobDescription}`;
      }

      // Build the prompt that will be sent to Gemini so we can attach it for "Copy Prompt"
      const promptForLLM = buildTailoredResumePrompt(jdText, masterLatexCode);

      const userMsg: ChatMessage = {
        role: "user",
        content: message,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          prompt: promptForLLM,
        },
      };
      newHistory.push(userMsg);

      const jobDescription = isFirstMessage ? message : project.jobDescription;
      const company = metadata?.company || project.company;
      const targetRole = metadata?.targetRole || project.targetRole;

      setProject((prev) =>
        prev
          ? { ...prev, chatHistory: newHistory, jobDescription, company, targetRole }
          : prev,
      );
      
      setBusy(true);
      setStage("Initializing Pipeline...");
      setPipelineSteps([]);
      setAtsScore(null);
      setBestScore(0);

      try {
        const result = await runResumePipeline({
          jd: jdText,
          masterResumeLatex: masterLatexCode,
          apiKey: resolveGeminiKey(apiKey),
          onStepUpdate: (steps) => {
            setPipelineSteps([...steps]);
            const runningStep = steps.find(s => s.status === 'running');
            if (runningStep) setStage(runningStep.label);
          },
          onScoreUpdate: (scoreData) => {
            setAtsScore(scoreData);
            setBestScore(prev => Math.max(prev, scoreData.score));
          }
        });

        // Pipeline completed
        const { latex, pdfBlob, bestScore: finalScore, finalSteps, pdfUrl, atsScore: pipelineAtsScore } = result;
        setPipelineSteps(finalSteps);
        
        let assistantContent = "";
        if (latex) {
          assistantContent = `✅ Resume tailored and optimized!\n\n**Final ATS Score:** ${finalScore}/100`;
          if (pdfBlob) {
            assistantContent += `\n\n✨ Successfully compiled to PDF! Review it in the preview panel.`;
          } else {
            assistantContent += `\n\n⚠️ LaTeX generated but PDF compilation failed. You can fix the syntax manually in the editor.`;
          }
        } else {
          const errorStep = finalSteps.find(s => s.status === 'error');
          const reason = errorStep?.detail || "Unknown error";
          assistantContent = `❌ Pipeline failed to generate a resume.\n\n**Reason:** ${reason}`;
        }

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: assistantContent,
          timestamp: Date.now(),
        };

        // Convert every possible undefined to null before ANY Firestore operation
        const safeLatex     = result?.latex ?? '';
        const safeScore     = result?.bestScore ?? 0;
        const safeAtsScore  = result?.atsScore ?? null;
        const safePdfUrl    = result?.pdfUrl ?? null;

        console.log('Firestore write payload:', {
          userId: user?.uid,
          projectId,
          latex: typeof safeLatex,
          atsScore: safeAtsScore,
          pdfUrl: safePdfUrl,
          bestScore: safeScore,
        });

        // Only proceed if we actually got a resume
        if (!safeLatex || safeLatex.trim().length < 50) {
          toast.error('Resume generation failed — no LaTeX output received.');
          // Ensure we still push the assistant message (which says failed) to history and project state
          const updated: ResumeProject = {
            ...project,
            chatHistory: [...newHistory, assistantMsg],
            jobDescription,
            company,
            targetRole,
          };
          setProject(updated);
          await updateProject(user.uid, project.id, {
            chatHistory: updated.chatHistory,
            jobDescription: updated.jobDescription,
            company: updated.company,
            targetRole: updated.targetRole,
          });
          return;
        }

        let activeVersionId = project.activeVersionId;
        const newVersions = [...project.versions];

        // Safe Firestore write for versions
        await saveResumeVersion(
          user.uid, 
          project.id, 
          safeLatex, 
          safeAtsScore, 
          safePdfUrl
        );

        // Keep inline array compat
        const newVersion: ResumeVersion = {
          id: crypto.randomUUID(),
          latex: safeLatex,
          createdAt: Date.now(),
          label: `v${project.versions.length + 1}`,
          company: company,
          role: targetRole,
          jobDescription: jobDescription,
          atsScore: safeAtsScore ?? undefined
        };
        newVersions.push(newVersion);
        activeVersionId = newVersion.id;

        const updated: ResumeProject = {
          ...project,
          chatHistory: [...newHistory, assistantMsg],
          jobDescription,
          company,
          targetRole,
          currentLatex: safeLatex,
          versions: newVersions,
          activeVersionId,
        };

        setProject(updated);
        await updateProject(user.uid, project.id, {
          chatHistory: updated.chatHistory,
          jobDescription: updated.jobDescription,
          company: updated.company,
          targetRole: updated.targetRole,
          currentLatex: updated.currentLatex,
          versions: updated.versions,
          activeVersionId: updated.activeVersionId,
        });
      } catch (e: any) {
        toast.error(e.message || "Failed to generate resume");
        const errorMsg: ChatMessage = {
          role: "assistant",
          content: `❌ Error: ${e.message || "Something went wrong"}. Please try again.`,
          timestamp: Date.now(),
        };
        setProject((prev) =>
          prev
            ? { ...prev, chatHistory: [...newHistory, errorMsg] }
            : prev,
        );
      } finally {
        setBusy(false);
        setStage("");
      }
    },
    [user, project, apiKey, masterLatex]
  );

  // Save current LaTeX as a new version
  const saveVersion = useCallback(
    async (label?: string) => {
      if (!user?.uid || !project || !project.currentLatex.trim()) {
        if (!user?.uid) console.error('No authenticated user — cannot write to Firestore');
        return;
      }
      const version: ResumeVersion = {
        id: crypto.randomUUID(),
        latex: project.currentLatex,
        createdAt: Date.now(),
        label: label || `v${project.versions.length + 1}`,
        company: project.company,
        role: project.targetRole,
        jobDescription: project.jobDescription,
      };
      const versions = [...project.versions, version];
      setProject({ ...project, versions, activeVersionId: version.id });
      await updateProject(user.uid, project.id, {
        versions,
        activeVersionId: version.id,
      });
      toast.success("Version saved");
    },
    [user, project],
  );

  // Restore a specific version
  const restoreVersion = useCallback(
    (versionId: string) => {
      if (!project) return;
      const version = project.versions.find((v) => v.id === versionId);
      if (!version) return;
      setProject({
        ...project,
        currentLatex: version.latex,
        activeVersionId: versionId,
      });
      if (user?.uid) {
        updateProject(user.uid, project.id, {
          currentLatex: version.latex,
          activeVersionId: versionId,
        });
      }
      toast.success(`Restored ${version.label || "version"}`);
    },
    [user, project],
  );

  // Delete a version
  const deleteVersion = useCallback(
    async (versionId: string) => {
      if (!user?.uid || !project) {
        if (!user?.uid) console.error('No authenticated user — cannot write to Firestore');
        return;
      }
      const versions = project.versions.filter((v) => v.id !== versionId);
      const activeVersionId =
        project.activeVersionId === versionId
          ? versions[versions.length - 1]?.id
          : project.activeVersionId;
      setProject({ ...project, versions, activeVersionId });
      await updateProject(user.uid, project.id, { versions, activeVersionId });
      toast.success("Version deleted");
    },
    [user, project],
  );

  // Update LaTeX directly from editor
  const updateLatex = useCallback(
    (latex: string) => {
      if (!project) return;
      setProject({ ...project, currentLatex: latex });
    },
    [project],
  );

  // Clear all chat messages for this project
  const clearChatHistory = useCallback(
    async () => {
      if (!user?.uid || !project) {
        if (!user?.uid) console.error('No authenticated user — cannot write to Firestore');
        return;
      }
      try {
        setProject({ ...project, chatHistory: [] });
        await updateProject(user.uid, project.id, { chatHistory: [] });
        toast.success("Chat history cleared");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to clear chat history";
        toast.error(msg);
        // Revert optimistic update on failure
        setProject(project);
      }
    },
    [user, project],
  );

  return {
    project,
    masterLatex,
    apiKey,
    loading,
    busy,
    stage,
    sendMessage,
    saveVersion,
    restoreVersion,
    deleteVersion,
    updateLatex,
    setProject,
    clearChatHistory,
  };
}
