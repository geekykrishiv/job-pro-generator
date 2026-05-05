import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMasterResume, saveMasterResume } from "@/lib/resumeStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MasterResume, Education, Experience, ProjectItem } from "@/types";

const empty: MasterResume = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  links: "",
  summary: "",
  education: [],
  experience: [],
  projects: [],
  skills: [],
};

const uid = () => crypto.randomUUID();

export default function MasterResumePage() {
  const { user } = useAuth();
  const [m, setM] = useState<MasterResume>(empty);
  const [skillsText, setSkillsText] = useState("");

  useEffect(() => {
    if (!user) return;
    getMasterResume(user.uid).then((data) => {
      if (data) {
        setM({ ...empty, ...data });
        setSkillsText((data.skills ?? []).join(", "));
      }
    });
  }, [user?.uid]);

  const save = async () => {
    if (!user) return;
    const toSave = { ...m, skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean) };
    await saveMasterResume(user.uid, toSave);
    toast.success("Master resume saved");
  };

  const addEdu = () =>
    setM({ ...m, education: [...m.education, { id: uid(), school: "", degree: "", field: "", startDate: "", endDate: "" }] });
  const addExp = () =>
    setM({ ...m, experience: [...m.experience, { id: uid(), company: "", role: "", startDate: "", endDate: "", bullets: [""] }] });
  const addProj = () =>
    setM({ ...m, projects: [...m.projects, { id: uid(), name: "", description: "" }] });

  const updEdu = (id: string, patch: Partial<Education>) =>
    setM({ ...m, education: m.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const updExp = (id: string, patch: Partial<Experience>) =>
    setM({ ...m, experience: m.experience.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const updProj = (id: string, patch: Partial<ProjectItem>) =>
    setM({ ...m, projects: m.projects.map((e) => (e.id === id ? { ...e, ...patch } : e)) });

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif">Master Resume</h1>
            <p className="text-sm text-muted-foreground">Your full background. The AI tailors versions from this.</p>
          </div>
          <Button onClick={save}>Save</Button>
        </div>

        <Card className="p-6 space-y-3">
          <h2 className="font-medium">Personal</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Full Name</Label><Input value={m.fullName} onChange={(e) => setM({ ...m, fullName: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={m.email} onChange={(e) => setM({ ...m, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={m.phone} onChange={(e) => setM({ ...m, phone: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={m.location} onChange={(e) => setM({ ...m, location: e.target.value })} /></div>
          </div>
          <div><Label>Links (LinkedIn, GitHub, Portfolio)</Label><Input value={m.links} onChange={(e) => setM({ ...m, links: e.target.value })} /></div>
          <div><Label>Summary</Label><Textarea value={m.summary} onChange={(e) => setM({ ...m, summary: e.target.value })} /></div>
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex justify-between items-center"><h2 className="font-medium">Education</h2><Button size="sm" variant="outline" onClick={addEdu}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
          {m.education.map((e) => (
            <div key={e.id} className="border border-border rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="School" value={e.school} onChange={(ev) => updEdu(e.id, { school: ev.target.value })} />
                <Input placeholder="Degree" value={e.degree} onChange={(ev) => updEdu(e.id, { degree: ev.target.value })} />
                <Input placeholder="Field" value={e.field} onChange={(ev) => updEdu(e.id, { field: ev.target.value })} />
                <Input placeholder="GPA" value={e.gpa ?? ""} onChange={(ev) => updEdu(e.id, { gpa: ev.target.value })} />
                <Input placeholder="Start" value={e.startDate} onChange={(ev) => updEdu(e.id, { startDate: ev.target.value })} />
                <Input placeholder="End" value={e.endDate} onChange={(ev) => updEdu(e.id, { endDate: ev.target.value })} />
              </div>
              <Textarea placeholder="Details" value={e.details ?? ""} onChange={(ev) => updEdu(e.id, { details: ev.target.value })} />
              <Button size="sm" variant="ghost" onClick={() => setM({ ...m, education: m.education.filter((x) => x.id !== e.id) })}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex justify-between items-center"><h2 className="font-medium">Experience</h2><Button size="sm" variant="outline" onClick={addExp}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
          {m.experience.map((e) => (
            <div key={e.id} className="border border-border rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Company" value={e.company} onChange={(ev) => updExp(e.id, { company: ev.target.value })} />
                <Input placeholder="Role" value={e.role} onChange={(ev) => updExp(e.id, { role: ev.target.value })} />
                <Input placeholder="Location" value={e.location ?? ""} onChange={(ev) => updExp(e.id, { location: ev.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Start" value={e.startDate} onChange={(ev) => updExp(e.id, { startDate: ev.target.value })} />
                  <Input placeholder="End" value={e.endDate} onChange={(ev) => updExp(e.id, { endDate: ev.target.value })} />
                </div>
              </div>
              <Textarea placeholder="Bullet points (one per line)" value={e.bullets.join("\n")} onChange={(ev) => updExp(e.id, { bullets: ev.target.value.split("\n") })} />
              <Button size="sm" variant="ghost" onClick={() => setM({ ...m, experience: m.experience.filter((x) => x.id !== e.id) })}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </Card>

        <Card className="p-6 space-y-3">
          <div className="flex justify-between items-center"><h2 className="font-medium">Projects</h2><Button size="sm" variant="outline" onClick={addProj}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
          {m.projects.map((p) => (
            <div key={p.id} className="border border-border rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Name" value={p.name} onChange={(ev) => updProj(p.id, { name: ev.target.value })} />
                <Input placeholder="Tech" value={p.tech ?? ""} onChange={(ev) => updProj(p.id, { tech: ev.target.value })} />
                <Input placeholder="Link" value={p.link ?? ""} onChange={(ev) => updProj(p.id, { link: ev.target.value })} />
              </div>
              <Textarea placeholder="Description" value={p.description} onChange={(ev) => updProj(p.id, { description: ev.target.value })} />
              <Button size="sm" variant="ghost" onClick={() => setM({ ...m, projects: m.projects.filter((x) => x.id !== p.id) })}><Trash2 className="h-3 w-3" /></Button>
            </div>
          ))}
        </Card>

        <Card className="p-6 space-y-3">
          <h2 className="font-medium">Skills</h2>
          <Textarea placeholder="comma, separated, skills" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
        </Card>

        <div className="pb-12">
          <Button onClick={save} className="w-full">Save Master Resume</Button>
        </div>
      </div>
    </div>
  );
}
