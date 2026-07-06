import { Sparkles, FileText, MoreVertical, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ChatMessage as ChatMessageType, GenerationStep, ATSScoreResult } from "@/types";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import GenerationStatus from "./GenerationStatus";
import { useAutoScroll } from "@/hooks/useAutoScroll";

interface Props {
  chatHistory: ChatMessageType[];
  onSend: (
    message: string,
    metadata?: { company?: string; targetRole?: string; instructions?: string },
  ) => void;
  onClearChat: () => Promise<void>;
  onDeleteMessage: (timestamp: number) => Promise<void>;
  busy: boolean;
  stage: string;
  projectName: string;
  jobDescription: string;
  pipelineSteps?: GenerationStep[];
  atsScore?: ATSScoreResult | null;
  bestScore?: number;
}

export default function ChatPanel({
  chatHistory,
  onSend,
  onClearChat,
  onDeleteMessage,
  busy,
  stage,
  projectName,
  jobDescription,
  pipelineSteps = [],
  atsScore = null,
  bestScore = 0,
}: Props) {
  const scrollRef = useAutoScroll(chatHistory.length + (busy ? 1 : 0));
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [openMenuTimestamp, setOpenMenuTimestamp] = useState<number | null>(null);
  const msgMenuRef = useRef<HTMLDivElement | null>(null);

  // Close per-message dropdown on any outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (msgMenuRef.current && !msgMenuRef.current.contains(e.target as Node)) {
        setOpenMenuTimestamp(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isFirstMessage = chatHistory.length === 0;

  const handleClearConfirm = async () => {
    setShowConfirm(false);
    await onClearChat();
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-medium text-sm truncate">{projectName}</h2>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {jobDescription
              ? jobDescription.slice(0, 80) + "..."
              : "Paste a job description to begin"}
          </p>
        </div>

        {/* Three-dot menu */}
        <div className="relative shrink-0">
          <button
            id="chat-panel-menu-btn"
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
            title="Chat options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-8 z-40 w-44 rounded-lg border border-border bg-popover shadow-lg py-1">
                <button
                  id="clear-chat-btn"
                  onClick={() => { setMenuOpen(false); setShowConfirm(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                  disabled={isFirstMessage}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear Chat History
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-popover border border-border rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="font-semibold text-base mb-1">Clear Chat History?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              All messages in this project will be removed. This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                id="cancel-clear-chat-btn"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-clear-chat-btn"
                onClick={handleClearConfirm}
                className="px-4 py-2 rounded-lg text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isFirstMessage && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-medium mb-2">Ready to tailor your resume</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Paste a job description below and I'll generate a tailored,
              ATS-optimized resume from your master profile.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Software Engineer at Google", "Data Scientist at Meta", "Product Manager"].map(
                (example) => (
                  <button
                    key={example}
                    onClick={() => onSend(example)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                  >
                    <FileText className="h-3 w-3 inline mr-1" />
                    {example}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {chatHistory.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            isMenuOpen={openMenuTimestamp === msg.timestamp}
            menuRef={openMenuTimestamp === msg.timestamp ? msgMenuRef : null}
            onToggleMenu={(e) => {
              e.stopPropagation();
              setOpenMenuTimestamp(
                openMenuTimestamp === msg.timestamp ? null : msg.timestamp,
              );
            }}
            onDelete={async () => {
              setOpenMenuTimestamp(null);
              await onDeleteMessage(msg.timestamp);
            }}
          />
        ))}

        {/* Typing indicator / Pipeline Progress */}
        {busy && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1 max-w-[85%]">
              {pipelineSteps.length > 0 ? (
                <GenerationStatus
                  steps={pipelineSteps}
                  atsScore={atsScore}
                  bestScore={bestScore}
                />
              ) : (
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 w-fit">
                  <div className="flex items-center gap-2">
                    <div className="typing-dots flex gap-1">
                      <span className="dot" />
                      <span className="dot" />
                      <span className="dot" />
                    </div>
                    <span className="text-xs text-muted-foreground">{stage || "Thinking..."}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={onSend} busy={busy} isFirstMessage={isFirstMessage} />
    </div>
  );
}
