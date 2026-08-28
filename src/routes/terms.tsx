import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/ui/Logo";
import { SITE_CONTACT } from "@/data/site-contact";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_UPDATED } from "@/data/terms";
import { ArrowLeft, Check, Mail, MessageCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Intopsmm SMM Panel" },
      {
        name: "description",
        content:
          "Read the Intopsmm terms of service, order rules, refill policy, refund policy and privacy practices before placing an SMM panel order.",
      },
      { property: "og:title", content: "Terms & Conditions — Intopsmm SMM Panel" },
      {
        property: "og:description",
        content:
          "Order rules, refill and refund policy, governing law and privacy details for Intopsmm SMM panel users.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/15 bg-[image:var(--gradient-primary)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[image:var(--gradient-primary)] px-4 pb-14 pt-10 text-primary-foreground sm:px-6">
        <div className="mx-auto max-w-5xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Legal
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Terms &amp; Conditions</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-base">
            {TERMS_INTRO}
          </p>
          <p className="mt-4 text-xs text-white/70">Last updated: {TERMS_UPDATED}</p>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* Index */}
          <nav className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              On this page
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {TERMS_SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-muted-foreground transition hover:text-primary">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-8">
            {TERMS_SECTIONS.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7"
              >
                <h2 className="text-lg font-semibold text-foreground sm:text-xl">{s.title}</h2>
                {s.intro && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.intro}</p>
                )}
                {s.points && (
                  <ul className="mt-4 space-y-3">
                    {s.points.map((p) => (
                      <li key={p} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {s.note && (
                  <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm text-foreground">
                    <strong>Note:</strong> {s.note}
                  </p>
                )}
              </section>
            ))}

            {/* Contact */}
            <section
              id="contact"
              className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-7"
            >
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">Contact</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <a
                  href={`mailto:${SITE_CONTACT.email}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm transition hover:border-primary hover:bg-muted"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{SITE_CONTACT.email}</span>
                </a>
                <a
                  href={SITE_CONTACT.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm transition hover:border-primary hover:bg-muted"
                >
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{SITE_CONTACT.whatsappNumber}</span>
                </a>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Thank you for choosing {SITE_CONTACT.domain} — we are here to help your presence grow
                online.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} {SITE_CONTACT.brand}. All rights reserved.
      </footer>
    </div>
  );
}
