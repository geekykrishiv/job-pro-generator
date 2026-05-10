import { Clock, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ResumeVersion } from "@/types";

interface Props {
  versions: ResumeVersion[];
  activeVersionId?: string;
  onRestore: (versionId: string) => void;
  onDelete: (versionId: string) => void;
  onClose: () => void;
}

export default function VersionHistory({
  versions,
  activeVersionId,
  onRestore,
  onDelete,
  onClose,
}: Props) {
  const sorted = [...versions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-sm">Version History</h3>
          <span className="text-xs text-muted-foreground">({versions.length})</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Version list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">
              No versions yet. Generate a resume to create your first version.
            </p>
          )}

          {sorted.map((v) => {
            const isActive = v.id === activeVersionId;
            const date = new Date(v.createdAt);

            return (
              <div
                key={v.id}
                className={`group relative rounded-lg border p-3 transition-colors ${
                  isActive
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:border-primary/20 hover:bg-muted/50"
                }`}
              >
                {/* Timeline dot */}
                <div className="flex items-start gap-3">
                  <div className="relative mt-1">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive
                          ? "bg-primary ring-2 ring-primary/20"
                          : "bg-muted-foreground/30"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {v.label || "Version"}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          Active
                        </span>
                      )}
                    </div>

                    {(v.company || v.role) && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {[v.role, v.company].filter(Boolean).join(" · ")}
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-1">
                      {date.toLocaleDateString()} at{" "}
                      {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs px-2"
                          onClick={() => onRestore(v.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2 text-destructive hover:text-destructive"
                        onClick={() => onDelete(v.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
