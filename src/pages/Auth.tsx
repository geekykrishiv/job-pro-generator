import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(cred.user);
        toast.success("Account created. Check your email to verify.");
        nav("/master");
      } else if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password);
        nav("/dashboard");
      } else {
        await sendPasswordResetEmail(auth, email);
        toast.success("Password reset email sent.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      nav("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-3xl font-serif mb-1">JobPro AI</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          {mode === "signin"
            ? "Welcome back."
            : mode === "signup"
            ? "Create your account."
            : "Reset your password."}
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "reset" && (
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Please wait..." : mode === "signin" ? "Sign In" : mode === "signup" ? "Sign Up" : "Send reset email"}
          </Button>
        </form>

        {mode !== "reset" && (
          <>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={google} disabled={busy}>
              Continue with Google
            </Button>
          </>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
          {mode !== "reset" ? (
            <button type="button" onClick={() => setMode("reset")} className="text-muted-foreground hover:text-foreground">
              Forgot password?
            </button>
          ) : (
            <button type="button" onClick={() => setMode("signin")} className="text-muted-foreground hover:text-foreground">
              Back to sign in
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}
