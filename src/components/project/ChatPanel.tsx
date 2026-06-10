import { Sparkles, FileText, Trash2 } from "lucide-react";
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
  onDeleteMessage?: (messageIndex: number) => Promise<void>;
  onClearChat?: () => void;
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
  onDeleteMessage,
  onClearChat,
  busy,
  stage,
  projectName,
  jobDescription,
  pipelineSteps = [],
  atsScore = null,
  bestScore = 0,
}: Props) {
  const scrollRef = useAutoScroll(chatHistory.length + (busy ? 1 : 0));

  const isFirstMessage = chatHistory.length === 0;

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the chat history and job description?")) {
      onClearChat?.();
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between">
        <div className="min-w-0 pr-8">
          <h2 className="font-medium text-sm truncate">{projectName}</h2>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {jobDescription
              ? jobDescription.slice(0, 80) + "..."
              : "Paste a job description to begin"}
          </p>
        </div>
        {onClearChat && !isFirstMessage && (
          <button
            onClick={handleClear}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
            title="Clear Chat"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

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
            key={msg.id ?? `${msg.timestamp}-${i}`}
            message={msg}
            onDelete={!busy && onDeleteMessage ? () => onDeleteMessage(i) : undefined}
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
