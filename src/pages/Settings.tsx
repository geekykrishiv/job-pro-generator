import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserSettings,
  saveUserSettings,
  validateGeminiKeyDetailed,
} from "@/lib/resumeStore";
import { resolveGeminiKey, isGeminiApiKey } from "@/lib/geminiKey";
import { GEMINI_CONFIG } from "@/config/gemini";
import { auth } from "@/lib/firebase";
import { updateProfile, deleteUser } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink, AlertTriangle } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [key, setKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  // Warn when the key originates from VITE_GEMINI_API_KEY (bundled into production JS)
  const envKeyExposed = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  useEffect(() => {
    if (!user?.uid) return;
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

  useEffect(() => {
    setKeyValid(null);
  }, [key]);

  const testKey = async () => {
    if (!key.trim()) {
      toast.error("Enter an API key first.");
      return;
    }
    setValidating(true);
    try {
      const result = await validateGeminiKeyDetailed(key.trim());
      setKeyValid(result.valid);
      if (result.valid) {
        toast.success("Gemini API key is valid!");
        if (user?.uid && isGeminiApiKey(key)) {
          await saveUserSettings(user.uid, { geminiKey: key.trim() });
          toast.success("Key saved to your account.");
        }
      } else {
        toast.error(result.error ?? "Invalid API key.");
      }
    } catch {
      setKeyValid(false);
      toast.error("Failed to validate key.");
    } finally {
      setValidating(false);
    }
  };

  const save = async () => {
    if (!user?.uid) return;
    const trimmed = key.trim();
    if (trimmed && !isGeminiApiKey(trimmed)) {
      toast.error("Gemini keys start with AIza... (from aistudio.google.com/apikey).");
      return;
    }
    await saveUserSettings(user.uid, { geminiKey: trimmed });
    if (displayName !== (user.displayName ?? "")) {
      await updateProfile(user, { displayName });
    }
    toast.success("Settings saved");
  };

  const handleDelete = async () => {
    if (!user?.uid) return;
    if (!confirm("Permanently delete your account? This cannot be undone.")) return;
    try {
      await deleteUser(user);
      toast.success("Account deleted");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg + " — you may need to sign in again first.");
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
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="AIza..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                disabled={loading}
                className={`pr-20 ${
                  keyValid === true
                    ? "border-green-500/50 focus-visible:ring-green-500/20"
                    : keyValid === false
                    ? "border-destructive/50 focus-visible:ring-destructive/20"
                    : ""
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {keyValid === true && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {keyValid === false && <XCircle className="h-4 w-4 text-destructive" />}
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testKey}
                disabled={validating || !key.trim()}
              >
                {validating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Testing...
                  </>
                ) : (
                  "Test Key"
                )}
              </Button>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Get a free key <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Free tier available on Google AI Studio. Model:{" "}
              <code className="text-[10px]">{GEMINI_CONFIG.MODEL}</code>
              . Optional: <code className="text-[10px]">GEMINI_API_KEY</code> in{" "}
              <code className="text-[10px]">.env.local</code>
              {resolveGeminiKey() ? " (env key detected)." : "."}
            </p>

            {/* Warning: VITE_GEMINI_API_KEY is bundled into the production build */}
            {envKeyExposed && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Dev-only key detected.</strong> Your{" "}
                  <code className="text-[10px]">VITE_GEMINI_API_KEY</code> is bundled into the
                  production JavaScript and visible to anyone who inspects the build. For
                  production use, enter your key in the field above — it will be stored
                  securely in your account instead.
                </span>
              </div>
            )}
          </div>
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
