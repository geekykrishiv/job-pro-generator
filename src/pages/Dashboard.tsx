import { FileText, Sparkles } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
      <h1 className="text-3xl font-serif mb-2">AI Resume Studio</h1>
      <p className="text-muted-foreground max-w-md">
        Create a new resume project from the sidebar, or fill out your master resume to get started.
      </p>
      <div className="flex gap-2 mt-6 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        Each project = one job description + tailored resume versions.
      </div>
    </div>
  );
}
