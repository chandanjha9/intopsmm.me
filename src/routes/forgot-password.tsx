import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2, TrendingUp, ArrowRight, CheckCircle2 } from "lucide-react";
import { BrandingPane } from "./login";
import { forgotPasswordServerFn } from "@/lib/auth/auth.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — Intopsmm" },
      { name: "description", content: "Reset your Intopsmm account password via email." },
      { property: "og:title", content: "Forgot password — Intopsmm" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = z.string().trim().email("Please enter a valid email address.").safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      await forgotPasswordServerFn({ data: { email: parsed.data } });
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandingPane />
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <a href="/" className="mb-8 inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold">Intopsmm</span>
          </a>

          {sent ? (
            /* ── Success state ── */
            <div className="mt-4 space-y-4 text-center">
              <div className="flex justify-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">
                If an account with <strong>{email}</strong> exists, we've sent a password reset link.
                It expires in <strong>1 hour</strong>.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="font-semibold text-primary hover:underline"
                >
                  try again
                </button>
                .
              </p>
              <a href="/login" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">
                ← Back to login
              </a>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <h1 className="text-3xl font-bold tracking-tight">Forgot password?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your account email and we'll send you a reset link.
              </p>

              <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}

                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send reset link <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <a href="/login" className="font-semibold text-primary hover:underline">
                  Back to login
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
