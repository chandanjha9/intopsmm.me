import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Mail, MessageCircle, Phone, Send, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Nav, Footer } from "@/routes/index";
import { SITE_CONFIG } from "@/lib/seo/site-config";
import { getBreadcrumbSchema } from "@/lib/seo/schema";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us & 24/7 Support Desk — Intopsmm" },
      {
        name: "description",
        content:
          "Reach Intopsmm customer support 24/7 via WhatsApp and email. Fast assistance for SMM orders, UPI payments, wallet deposits, and API integration.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: "Contact Us & 24/7 Support Desk — Intopsmm" },
      {
        property: "og:description",
        content: "Connect directly with our dedicated technical support team via WhatsApp and email.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_CONFIG.siteUrl}/contact` },
      { property: "og:image", content: `${SITE_CONFIG.siteUrl}/og-image.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_CONFIG.siteUrl}/contact` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            getBreadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Contact", path: "/contact" },
            ]),
            {
              "@type": "ContactPage",
              name: "Contact Intopsmm",
              url: `${SITE_CONFIG.siteUrl}/contact`,
              description: "Customer service and technical support contact information for Intopsmm.",
              mainEntity: {
                "@type": "Organization",
                name: SITE_CONFIG.brand,
                email: SITE_CONFIG.email,
                telephone: SITE_CONFIG.supportPhone,
              },
            },
          ],
        }),
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const channels = [
    {
      icon: MessageCircle,
      title: "Direct WhatsApp Support",
      detail: SITE_CONFIG.supportPhone,
      sub: "Instant response · 7 Days a week",
      link: SITE_CONFIG.whatsappLink,
      cta: "Chat on WhatsApp",
      isPrimary: true,
    },
    {
      icon: Mail,
      title: "Official Email Desk",
      detail: SITE_CONFIG.email,
      sub: "Response within 1-2 hours",
      link: `mailto:${SITE_CONFIG.email}`,
      cta: "Send an Email",
      isPrimary: false,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* Header */}
      <section className="border-b border-border/40 bg-gradient-to-b from-primary/10 via-background to-background px-4 pb-14 pt-10 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> 24/7 Dedicated Support
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Contact Intopsmm — 24/7 Support Desk & Inquiries
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Have an inquiry about an order, custom API partnership, or automated UPI deposit? Reach out through our
            verified channels below.
          </p>
        </div>
      </section>

      {/* Contact Channels */}
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {channels.map((ch, idx) => (
            <Card
              key={idx}
              className={`flex flex-col justify-between p-6 shadow-card transition hover:border-primary/50 ${
                ch.isPrimary ? "border-primary/40 bg-card" : "border-border/60 bg-card"
              }`}
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <ch.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-foreground">{ch.title}</h2>
                <p className="mt-1 text-base font-semibold text-primary">{ch.detail}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ch.sub}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40">
                <Button
                  asChild
                  variant={ch.isPrimary ? "default" : "outline"}
                  className="w-full rounded-xl font-semibold"
                >
                  <a href={ch.link} target="_blank" rel="noopener noreferrer">
                    {ch.cta}
                  </a>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Operating Hours & Guarantee */}
        <div className="mt-12 rounded-2xl border border-border/60 bg-muted/20 p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Support Hours</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  24 Hours a day, 7 days a week, 365 days a year including holidays.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Send className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Fast Resolution</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  WhatsApp tickets answered in 2-5 minutes. Email queries answered in under 2 hours.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Safety Guarantee</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your transaction IDs, registered email, and links are kept strictly confidential.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
