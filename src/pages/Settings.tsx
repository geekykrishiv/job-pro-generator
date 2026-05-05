import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserSettings, saveUserSettings } from "@/lib/resumeStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserSettings(user.uid).then((s) => {
      setKey(s.geminiKey ?? "");
      setLoading(false);
    });
  }, [user?.uid]);

  const save = async () => {
    if (!user) return;
    await saveUserSettings(user.uid, { geminiKey: key.trim() });
    toast.success("Settings saved");
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-serif mb-2">Settings</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your Gemini API key is stored in Firestore under your account.
        </p>
        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="key">Gemini API Key</Label>
            <Input
              id="key"
              type="password"
              placeholder="AIza..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Get a key at{" "}
              <a
                className="underline"
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                aistudio.google.com/apikey
              </a>
              . Note: requests are made directly from your browser.
            </p>
          </div>
          <Button onClick={save}>Save</Button>
        </Card>
      </div>
    </div>
  );
}
