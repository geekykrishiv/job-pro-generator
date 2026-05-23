import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserSettings,
  saveUserSettings,
  validateAnthropicKeyDetailed,
} from "@/lib/resumeStore";
import { resolveAnthropicKey } from "@/lib/claude";
import { isAnthropicApiKey } from "@/lib/anthropicKey";
import { auth } from "@/lib/firebase";
import { updateProfile, deleteUser } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, ExternalLink } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [key, setKey] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [showKey, setShowKey] = useState(false);
  const [validating, setValidating] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    setDisplayName(user.displayName ?? "");
    getUserSettings(user.uid).then((s) => {
      setKey(s.anthropicKey ?? "");
      if (s.hasLegacyGeminiKey) {
        toast.error(
          "Your saved key is a Google Gemini key (AIza...). Paste a new Anthropic key (sk-ant-...) and save.",
          { duration: 8000 },
        );
      }
      setLoading(false);
    });
  }, [user?.uid]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Reset validation status when key changes
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
      const result = await validateAnthropicKeyDetailed(key.trim());
      setKeyValid(result.valid);
      if (result.valid) {
        toast.success("API key is valid!");
        if (user?.uid && isAnthropicApiKey(key)) {
          await saveUserSettings(user.uid, { anthropicKey: key.trim() });
          toast.success("Key saved to your account.");
        }
      } else {
        toast.error(result.error ?? "Invalid API key. Check and try again.");
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
    if (trimmed && !isAnthropicApiKey(trimmed)) {
      toast.error("Anthropic keys must start with sk-ant- (from console.anthropic.com).");
      return;
    }
    await saveUserSettings(user.uid, { anthropicKey: trimmed });
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
          <h2 className="font-medium">Anthropic API Key</h2>
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="sk-ant-..."
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
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Get a key <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground">
              Model: Claude Sonnet 4.6 (<code className="text-[10px]">claude-sonnet-4-6</code>).
              Key is stored in Firestore, or set <code className="text-[10px]">VITE_ANTHROPIC_API_KEY</code> in{" "}
              <code className="text-[10px]">.env.local</code>
              {resolveAnthropicKey() ? " (env key detected)." : "."}
            </p>
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
