import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import ChatPanel from "@/components/project/ChatPanel";
import LatexEditor from "@/components/project/LatexEditor";
import { updateProject } from "@/lib/resumeStore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ProjectView() {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    project,
    loading,
    busy,
    stage,
    sendMessage,
    saveVersion,
    restoreVersion,
    deleteVersion,
    updateLatex,
    pipelineSteps,
    atsScore,
    bestScore
  } = useProject(id);

  const [showChat, setShowChat] = useState(false);

  // Default chat visibility based on latex content
  useEffect(() => {
    if (project && !loading) {
      // Show chat if there's no latex (e.g., new project)
      if (!project.currentLatex) {
        setShowChat(true);
      }
    }
  }, [project?.id, loading]);

  // Auto-hide chat when generation completes
  useEffect(() => {
    if (!busy && project?.currentLatex) {
      setShowChat(false);
    }
  }, [busy]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 bg-[#1e1e1e]">
        Project not found.
      </div>
    );
  }

  const handleRegenerate = () => {
    if (!project.jobDescription) {
      toast.error("No job description yet. Paste one in the chat first.");
      return;
    }
    sendMessage(
      `Regenerate the resume for this job description. Create a fresh, optimized version.\n\nJob Description:\n${project.jobDescription}`,
    );
    setShowChat(true);
  };

  return (
    <div className="h-full w-full flex relative overflow-hidden bg-[#1e1e1e]">
      
      {/* ── Chat Panel Overlay / Sidebar ── */}
      <div 
        className={`absolute inset-y-0 left-0 z-20 w-full md:w-96 shadow-2xl border-r border-[#404040] bg-background transition-transform duration-300 ease-in-out ${
          showChat ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full relative">
          {/* Close button for mobile/overlay mode */}
          <button 
            onClick={() => setShowChat(false)}
            className="absolute top-3 right-3 z-30 p-1.5 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground"
            title="Close Chat"
          >
            ✕
          </button>
          
          <ChatPanel
            chatHistory={project.chatHistory}
            onSend={sendMessage}
            busy={busy}
            stage={stage}
            projectName={project.name}
            jobDescription={project.jobDescription}
            pipelineSteps={pipelineSteps}
            atsScore={atsScore}
            bestScore={bestScore}
          />
        </div>
      </div>

      {/* ── Main Editor Area ── */}
      <div className="flex-1 h-full w-full">
        <LatexEditor
          latex={project.currentLatex}
          onLatexChange={updateLatex}
          onSaveVersion={() => saveVersion()}
          onRegenerate={handleRegenerate}
          versions={project.versions}
          activeVersionId={project.activeVersionId}
          onRestoreVersion={restoreVersion}
          onDeleteVersion={deleteVersion}
          busy={busy}
          atsScore={atsScore}
          onToggleChat={() => setShowChat(!showChat)}
        />
      </div>

      {/* ── Backdrop for mobile when chat is open ── */}
      {showChat && (
        <div 
          className="absolute inset-0 z-10 bg-black/50 md:hidden"
          onClick={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
