import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Sparkles, Plus, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listProjects, createProject, getMasterLatexResume } from "@/lib/resumeStore";
import type { ResumeProject } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<ResumeProject[]>([]);
  const [hasMaster, setHasMaster] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    listProjects(user.uid).then(setProjects);
    getMasterLatexResume(user.uid).then((m) => setHasMaster(!!m?.latexCode)).catch(() => setHasMaster(false));
  }, [user?.uid]);

  const handleNew = async () => {
    if (!user?.uid) {
      console.error('No authenticated user — cannot write to Firestore');
      return;
    }
    const name = prompt("Project name?", "Untitled Resume");
    if (!name) return;
    const p = await createProject(user.uid, name);
    nav(`/project/${p.id}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Sparkles className="h-4 w-4" /> JobPro AI
          </div>
          <h1 className="text-4xl font-serif mt-2">Tailor a resume for any job.</h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            Paste a job description, and JobPro AI generates an ATS-optimized, LaTeX-rendered resume from your master profile.
          </p>
        </div>

        {hasMaster === false && (
          <Card className="p-6 flex items-center justify-between bg-muted/30">
            <div>
              <h3 className="font-medium">Finish onboarding</h3>
              <p className="text-sm text-muted-foreground">Upload your master LaTeX resume to start generating tailored versions.</p>
            </div>
            <Button asChild><Link to="/master">Set up <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Recent projects</h2>
          <Button onClick={handleNew} size="sm"><Plus className="h-4 w-4 mr-1" />New Resume</Button>
        </div>

        {projects.length === 0 ? (
          <Card className="p-10 text-center border-dashed">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No projects yet. Create one to get started.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <Link key={p.id} to={`/project/${p.id}`}>
                <Card className="p-5 hover:shadow-md transition-shadow h-full">
                  <FileText className="h-5 w-5 text-muted-foreground mb-3" />
                  <h3 className="font-medium truncate">{p.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {p.jobDescription || "No job description yet."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-3">
                    {p.versions.length} version{p.versions.length === 1 ? "" : "s"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
