import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Lock,
  User,
  Check,
  Loader2,
} from "lucide-react";
import { BrandingPane, GoogleMark } from "./login";
import { useAuth } from "@/hooks/use-auth";
import { checkAvailabilityServerFn } from "@/lib/auth/auth.functions";

import { Logo } from "@/components/ui/Logo";
import { isFirebaseConfigured } from "@/lib/firebase";

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
  const { session, loading, register, loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  const score = useMemo(() => passwordScore(password), [password]);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const usernameOk = /^[a-zA-Z0-9_]{3,30}$/.test(username);

  // Live availability: null = unknown/checking, true = free, false = taken
  const [emailFree, setEmailFree] = useState<boolean | null>(null);
  const [usernameFree, setUsernameFree] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!emailValid && !usernameOk) {
      setEmailFree(null);
      setUsernameFree(null);
      return;
    }
    let cancelled = false;
    setChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await checkAvailabilityServerFn({
          data: {
            email: emailValid ? email : undefined,
            username: usernameOk ? username : undefined,
          },
        });
        if (cancelled) return;
        setEmailFree(emailValid ? res.emailAvailable : null);
        setUsernameFree(usernameOk ? res.usernameAvailable : null);
      } catch {
        if (!cancelled) {
          setEmailFree(null);
          setUsernameFree(null);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setChecking(false);
    };
  }, [email, username, emailValid, usernameOk]);

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

  const handleGoogleSignup = async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      toast.info("Google Sign-Up is coming soon! Please register with email and password.");
      return;
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Account created with Google!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      if (!msg.includes("popup-closed") && !msg.includes("cancelled")) {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  
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
          <Link to="/" className="mb-8 inline-flex items-center">
            <Logo />
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            It takes 30 seconds — fill everything below and you're in.
          </p>

          <Button
            id="google-register-btn"
            type="button"
            variant="outline"
            size="lg"
            className="mt-6 w-full gap-2"
            onClick={handleGoogleSignup}
            disabled={googleLoading || submitting}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleMark className="h-4 w-4" />
            )}
            Continue with Google
            {!isFirebaseConfigured && (
              <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Coming Soon
              </span>
            )}
          </Button>
          <div className="relative my-6 flex items-center gap-3">
            <div className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">or register with email</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSignUp();
            }}
          >
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
                    !usernameOk
                      ? "text-muted-foreground"
                      : usernameFree === false
                        ? "text-destructive"
                        : usernameFree === true
                          ? "text-primary"
                          : "text-muted-foreground"
                  }`}
                >
                  {!usernameOk
                    ? "3-30 characters — letters, numbers and underscore only"
                    : usernameFree === false
                      ? "✕ This username is already taken"
                      : usernameFree === true
                        ? "✓ Username is available"
                        : "Checking availability…"}
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
                    !emailValid || emailFree === false
                      ? "text-destructive"
                      : emailFree === true
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {!emailValid
                    ? "Enter a valid email address"
                    : emailFree === false
                      ? "✕ This email is already registered — please login instead"
                      : emailFree === true
                        ? "✓ Email is available"
                        : "Checking availability…"}
                </p>
              )}

            </div>

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
                    className={`h-1.5 flex-1 rounded-full ${i < score ? strengthColor : "bg-secondary"}`}
                  />
                ))}
              </div>
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

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={
                submitting ||
                checking ||
                !usernameOk ||
                !emailValid ||
                emailFree === false ||
                usernameFree === false ||
                score < 2 ||
                !terms
              }

            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Creating account…
                </>
              ) : (
                <>
                  Sign Up <Check className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
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
