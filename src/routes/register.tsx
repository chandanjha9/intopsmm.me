import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
} from "lucide-react";
import { BrandingPane } from "./login";
import { useAuth } from "@/hooks/use-auth";

const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Use letters, numbers and underscores only" }),
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).max(72),
});

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Intopsmm" },
      { name: "description", content: "Create your Intopsmm account and start growing your social media in minutes." },
      { property: "og:title", content: "Create account — Intopsmm" },
      { property: "og:description", content: "Free to start. Pay only for what you use." },
    ],
  }),
  component: RegisterPage,
});

function passwordScore(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function RegisterPage() {
  const navigate = useNavigate();
  const { session, loading, register } = useAuth();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const usernameOk = username.length >= 3;

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  const handleSignUp = async () => {
    setError(null);
    const parsed = signUpSchema.safeParse({ username, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    try {
      await register(parsed.data.email, parsed.data.password, parsed.data.username);
      toast.success("Account created!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register account";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const strengthLabel = ["Too weak", "Weak", "Okay", "Strong", "Excellent"][score];
  const strengthColor = [
    "bg-destructive",
    "bg-warning",
    "bg-warning",
    "bg-primary",
    "bg-primary",
  ][score];

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandingPane />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold">Intopsmm</span>
          </Link>

          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-colors ${
                    n <= step ? "bg-[image:var(--gradient-primary)]" : "bg-secondary"
                  }`}
                />
                <p
                  className={`mt-2 text-xs font-medium ${
                    n <= step ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  Step {n}
                </p>
              </div>
            ))}
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            {step === 1 && "Create your account"}
            {step === 2 && "Secure your account"}
            {step === 3 && "Almost done"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === 1 && "Start with your identity — it takes 30 seconds."}
            {step === 2 && "Pick a strong password to protect your wallet."}
            {step === 3 && "Review and accept our terms to finish."}
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (step < 3) setStep(step + 1);
              else void handleSignUp();
            }}
          >
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="growth_hero"
                      className="pl-9"
                      required
                    />
                  </div>
                  {username && (
                    <p
                      className={`text-xs ${
                        usernameOk ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {usernameOk ? "✓ Username is available" : "Must be at least 3 characters"}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@growth.io"
                      className="pl-9"
                      required
                    />
                  </div>
                  {email && (
                    <p
                      className={`text-xs ${
                        emailValid ? "text-primary" : "text-destructive"
                      }`}
                    >
                      {emailValid ? "✓ Looks good" : "Enter a valid email address"}
                    </p>
                  )}
                </div>
              </>
            )}

            {step === 2 && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="pl-9"
                    required
                  />
                </div>
                <div className="mt-2 flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < score ? strengthColor : "bg-secondary"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Strength: <span className="font-medium text-foreground">{strengthLabel}</span>
                </p>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="glass shadow-card rounded-2xl border border-border/60 p-4">
                  <p className="text-sm font-semibold">Review</p>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Username</span>
                      <span className="font-medium">{username || "—"}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{email || "—"}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Password</span>
                      <span className="font-medium">{strengthLabel}</span>
                    </li>
                  </ul>
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    id="terms"
                    checked={terms}
                    onCheckedChange={(v) => setTerms(v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-muted-foreground">
                    I agree to the{" "}
                    <a href="#" className="font-medium text-primary hover:underline">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="#" className="font-medium text-primary hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
              </>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="flex-1"
                disabled={
                  submitting ||
                  (step === 1 && (!usernameOk || !emailValid)) ||
                  (step === 2 && score < 2) ||
                  (step === 3 && !terms)
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating account…
                  </>
                ) : step < 3 ? (
                  <>
                    Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Create Account <Check className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
