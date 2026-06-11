import { Sparkles, User, Copy, Check, ClipboardList } from "lucide-react";
import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types";
import { toast } from "sonner";

interface Props {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: Props) {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);
  const isUser = message.role === "user";

  const copyContent = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPrompt = async () => {
    if (!message.metadata?.prompt) return;
    try {
      await navigator.clipboard.writeText(message.metadata.prompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
      toast.success("Prompt copied to clipboard");
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`chat-message group flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-violet-500 to-indigo-600 text-white"
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        }`}
      >
        {/* Metadata badges */}
        {isUser && message.metadata && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.metadata.company && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20">
                {message.metadata.company}
              </span>
            )}
            {message.metadata.targetRole && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/20">
                {message.metadata.targetRole}
              </span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="text-sm whitespace-pre-wrap leading-relaxed chat-content">
          {message.content}
        </div>

        {/* Footer */}
        <div className={`flex items-center gap-2 mt-2 ${isUser ? "justify-end" : "justify-between"}`}>
          <span className={`text-[10px] ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {time}
          </span>
          <div className="flex items-center gap-1">
            {/* Copy Prompt button — shown only on user messages that have a stored prompt */}
            {isUser && message.metadata?.prompt && (
              <button
                id="copy-prompt-btn"
                onClick={copyPrompt}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/20"
                title="Copy prompt sent to AI"
              >
                {promptCopied ? (
                  <Check className="h-3 w-3 text-green-300" />
                ) : (
                  <ClipboardList className="h-3 w-3 text-primary-foreground/60" />
                )}
              </button>
            )}
            {/* Copy message content — shown on assistant messages */}
            {!isUser && (
              <button
                onClick={copyContent}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-background/50"
                title="Copy message"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
