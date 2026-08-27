import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  ArrowRight,
  Sparkles,
  Zap,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/ui/Logo";

import { isFirebaseConfigured } from "@/lib/firebase";

function safePath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Log in — Intopsmm" },
      { name: "description", content: "Log in to your Intopsmm account to manage orders, wallet and campaigns." },
      { property: "og:title", content: "Log in — Intopsmm" },
      { property: "og:description", content: "Access your SMM dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { session, loading, login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const destination = safePath(redirect);

  useEffect(() => {
    if (!loading && session) navigate({ to: destination, replace: true });
  }, [loading, session, destination, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const loginEmail = email.trim();
    const loginPassword = password;

    if (!loginEmail || !loginPassword) {
      setError("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      toast.success("Welcome back!");
      navigate({ to: destination, replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log in";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      toast.info("Google Sign-In is coming soon! Please sign in with email and password.");
      return;
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google!");
      navigate({ to: destination, replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      // User closed popup is not really an error
      if (!msg.includes("popup-closed") && !msg.includes("cancelled")) {
        setError(msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandingPane />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center">
            <Logo />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Log in to your dashboard and keep growing.
          </p>

          {/* Google Sign-In */}
          <Button
            id="google-login-btn"
            type="button"
            variant="outline"
            size="lg"
            className="mt-6 w-full gap-2"
            onClick={handleGoogleLogin}
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
            <span className="text-xs text-muted-foreground">or sign in with email</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@growth.io"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox id="remember" defaultChecked /> Keep me signed in
            </label>

            {error && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button id="email-login-btn" type="submit" variant="hero" size="lg" className="w-full" disabled={submitting || googleLoading}>
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Logging in…
                </>
              ) : (
                <>
                  Log in <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.7c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.7 14.7 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.6-5.9l-7.6-5.9c-2 1.4-4.8 2.4-8 2.4-6.4 0-11.7-3.8-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export function BrandingPane() {
  return (
    <div className="relative hidden overflow-hidden bg-hero lg:block">
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(0.72 0.19 148 / 0.1) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.72 0.19 148 / 0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-12">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="h-3.5 w-3.5" /> Trusted by 40,000+ creators
        </div>
        <div>
          <h2 className="text-4xl font-bold leading-tight">
            Grow faster with the <span className="gradient-text">#1 SMM platform</span>.
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Instant delivery, real-time tracking and a wallet built for scale. Trusted by
            creators and agencies in 170+ countries.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              { icon: Zap, label: "Orders start in under 60 seconds" },
              { icon: ShieldCheck, label: "PCI-compliant, secure by default" },
              { icon: TrendingUp, label: "Refill guarantees on eligible services" },
            ].map((f) => (
              <div key={f.label} className="glass shadow-card flex items-center gap-3 rounded-2xl border border-border/60 p-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <f.icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Intopsmm — Automate your growth.
        </p>
      </div>
    </div>
  );
}
