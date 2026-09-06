import { Sparkles, Zap, ShieldCheck, TrendingUp } from "lucide-react";

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
