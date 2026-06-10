import { Sparkles, User, Copy, Check, Trash2 } from "lucide-react";
import { useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types";

interface Props {
  message: ChatMessageType;
  onDelete?: () => Promise<void>;
}

export default function ChatMessage({ message, onDelete }: Props) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isUser = message.role === "user";

  const copyContent = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const deleteMessage = async () => {
    if (!onDelete || !window.confirm("Delete this message?")) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
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
        <div className="flex items-center justify-between gap-2 mt-2">
          <span className={`text-[10px] ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
            {time}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isUser && (
              <button
                onClick={copyContent}
                className="p-1 rounded hover:bg-background/50"
                title="Copy message"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            )}
            {onDelete && (
              <button
                onClick={deleteMessage}
                disabled={deleting}
                className="p-1 rounded hover:bg-destructive/15 disabled:opacity-50"
                title="Delete message"
              >
                <Trash2 className={`h-3 w-3 ${isUser ? "text-primary-foreground/70" : "text-destructive"}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
