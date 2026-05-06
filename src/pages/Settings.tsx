import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserSettings, saveUserSettings } from "@/lib/resumeStore";
import { auth } from "@/lib/firebase";
import { updateProfile, deleteUser } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [key, setKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? "");
    getUserSettings(user.uid).then((s) => {
      setKey(s.geminiKey ?? "");
      setLoading(false);
    });
  }, [user?.uid]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const save = async () => {
    if (!user) return;
    await saveUserSettings(user.uid, { geminiKey: key.trim() });
    if (displayName !== (user.displayName ?? "")) {
      await updateProfile(user, { displayName });
    }
    toast.success("Settings saved");
  };

  const handleDelete = async () => {
    if (!user) return;
    if (!confirm("Permanently delete your account? This cannot be undone.")) return;
    try {
      await deleteUser(user);
      toast.success("Account deleted");
    } catch (e: any) {
      toast.error(e.message + " — you may need to sign in again first.");
    }
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-serif mb-1">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your profile, API key, and appearance.</p>
        </div>

        <Card className="p-6 space-y-4">
          <h2 className="font-medium">Profile</h2>
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-medium">Gemini API Key</h2>
          <Input
            type="password"
            placeholder="AIza..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Get a key at{" "}
            <a className="underline" href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
              aistudio.google.com/apikey
            </a>
            . Requests are made directly from your browser.
          </p>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="font-medium">Appearance</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark mode</Label>
              <p className="text-xs text-muted-foreground">Toggle theme.</p>
            </div>
            <Switch checked={dark} onCheckedChange={setDark} />
          </div>
        </Card>

        <Button onClick={save} className="w-full">Save changes</Button>

        <Card className="p-6 space-y-3 border-destructive/40">
          <h2 className="font-medium text-destructive">Danger zone</h2>
          <p className="text-xs text-muted-foreground">Permanently delete your account.</p>
          <Button variant="destructive" onClick={handleDelete}>Delete account</Button>
        </Card>
      </div>
    </div>
  );
}
