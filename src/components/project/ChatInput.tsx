import { useState, useRef, useEffect } from "react";
import { Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onSend: (
    message: string,
    metadata?: { company?: string; targetRole?: string; instructions?: string },
  ) => void;
  busy: boolean;
  isFirstMessage: boolean;
}

export default function ChatInput({ onSend, busy, isFirstMessage }: Props) {
  const [message, setMessage] = useState("");
  const [showMeta, setShowMeta] = useState(false);
  const [company, setCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [instructions, setInstructions] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [message]);

  const handleSend = () => {
    if (!message.trim() || busy) return;
    const meta =
      company || targetRole || instructions
        ? { company: company.trim(), targetRole: targetRole.trim(), instructions: instructions.trim() }
        : undefined;
    onSend(message.trim(), meta);
    setMessage("");
    setCompany("");
    setTargetRole("");
    setInstructions("");
    setShowMeta(false);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-bar border-t border-border bg-background/80 backdrop-blur-sm p-3">
      {/* Collapsible metadata fields */}
      {isFirstMessage && (
        <button
          type="button"
          onClick={() => setShowMeta(!showMeta)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          {showMeta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Add target company, role, or instructions
        </button>
      )}

      {showMeta && (
        <div className="grid grid-cols-2 gap-2 mb-3 animate-in slide-in-from-top-2 duration-200">
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Target company (optional)"
            className="h-8 text-xs"
          />
          <Input
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="Target role (optional)"
            className="h-8 text-xs"
          />
          <Input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Additional instructions (optional)"
            className="h-8 text-xs col-span-2"
          />
        </div>
      )}

      {/* Main input */}
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isFirstMessage
              ? "Paste a job description to generate your resume..."
              : "Ask for changes — e.g. 'Add more focus on React experience'..."
          }
          rows={1}
          disabled={busy}
          className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50 transition-shadow"
        />
        <Button
          onClick={handleSend}
          disabled={busy || !message.trim()}
          size="icon"
          className="shrink-0 h-10 w-10 rounded-xl"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
        {busy ? "" : "Ctrl+Enter to send"}
      </p>
    </div>
  );
}
