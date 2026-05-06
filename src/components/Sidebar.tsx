import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { listProjects, createProject } from "@/lib/resumeStore";
import type { ResumeProject } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, FileText, User, Settings, LogOut, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Sidebar() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<ResumeProject[]>([]);
  const [search, setSearch] = useState("");

  const refresh = async () => {
    if (!user) return;
    setProjects(await listProjects(user.uid));
  };

  useEffect(() => {
    refresh();
  }, [user?.uid]);

  const handleNew = async () => {
    if (!user) return;
    const name = prompt("Project name?", "Untitled Resume");
    if (!name) return;
    const p = await createProject(user.uid, name);
    await refresh();
    nav(`/project/${p.id}`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast.success("Signed out");
    nav("/auth");
  };

  return (
    <aside className="w-64 border-r border-border bg-sidebar h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="font-serif text-lg">JobPro AI</h2>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-1">{user?.email}</p>
      </div>

      <div className="p-3 space-y-2">
        <Button onClick={handleNew} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Resume
        </Button>
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        <p className="text-xs uppercase text-muted-foreground px-2 py-2">Projects</p>
        {projects.length === 0 && (
          <p className="text-xs text-muted-foreground px-2">No projects yet.</p>
        )}
        {projects
          .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
          .map((p) => (
          <NavLink
            key={p.id}
            to={`/project/${p.id}`}
            className={({ isActive }) =>
              `flex items-center gap-2 px-2 py-2 rounded text-sm hover:bg-sidebar-accent ${
                isActive ? "bg-sidebar-accent font-medium" : ""
              }`
            }
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{p.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="border-t border-border p-2 space-y-1">
        <NavLink
          to="/master"
          className={({ isActive }) =>
            `flex items-center gap-2 px-2 py-2 rounded text-sm hover:bg-sidebar-accent ${
              isActive ? "bg-sidebar-accent" : ""
            }`
          }
        >
          <User className="h-4 w-4" /> Master Resume
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-2 px-2 py-2 rounded text-sm hover:bg-sidebar-accent ${
              isActive ? "bg-sidebar-accent" : ""
            }`
          }
        >
          <Settings className="h-4 w-4" /> Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-2 rounded text-sm hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
