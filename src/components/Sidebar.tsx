import { NavLink, useNavigate, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { listProjects, createProject, deleteProject } from "@/lib/resumeStore";
import type { ResumeProject } from "@/types";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Settings, LogOut, Search, Sparkles, Code, MoreVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ATSBadge from "@/components/ATSBadge";

export default function Sidebar() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id: activeProjectId } = useParams();
  const [projects, setProjects] = useState<ResumeProject[]>([]);
  const [search, setSearch] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const refresh = async () => {
    if (!user) return;
    setProjects(await listProjects(user.uid));
  };

  useEffect(() => {
    refresh();
  }, [user?.uid]);

  // Close dropdown on any outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenMenuId(null);

    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    if (!user) return;

    try {
      await deleteProject(user.uid, projectId);
      const remaining = projects.filter((p) => p.id !== projectId);
      setProjects(remaining);
      toast.success("Project deleted");

      // If the deleted project was open, navigate away
      if (activeProjectId === projectId) {
        if (remaining.length > 0) {
          nav(`/project/${remaining[0].id}`);
        } else {
          nav("/");
        }
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
      toast.error("Failed to delete project. Please try again.");
    }
  };

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground px-2">No projects yet.</p>
        )}
        {filtered.map((p) => {
          const latestScore = p.versions?.[p.versions.length - 1]?.atsScore?.score;
          const isMenuOpen = openMenuId === p.id;

          return (
            <div key={p.id} className="relative group" ref={isMenuOpen ? menuRef : null}>
              <NavLink
                to={`/project/${p.id}`}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2 py-2 rounded text-sm hover:bg-sidebar-accent pr-8 ${
                    isActive ? "bg-sidebar-accent font-medium" : ""
                  }`
                }
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </div>
                {latestScore ? (
                  <ATSBadge score={latestScore} className="ml-2 scale-90 origin-right shrink-0" />
                ) : null}
              </NavLink>

              {/* Three-dot menu button — visible only on row hover */}
              <button
                title="Project options"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : p.id);
                }}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-sidebar-accent text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>

              {/* Dropdown menu */}
              {isMenuOpen && (
                <div className="absolute right-1 top-full mt-0.5 z-50 min-w-[130px] rounded-md border border-border bg-popover shadow-md py-1">
                  <button
                    onClick={(e) => handleDeleteProject(e, p.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete project
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
          <Code className="h-4 w-4" /> Master LaTeX
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
