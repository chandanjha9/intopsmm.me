import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Globe2, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Nav, Footer } from "@/routes/index";
import { SITE_CONFIG } from "@/lib/seo/site-config";
import { getBreadcrumbSchema } from "@/lib/seo/schema";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Us — India's Premier SMM Growth Partner | Intopsmm" },
      {
        name: "description",
        content:
          "Learn about Intopsmm's mission, high-speed automated server infrastructure, customer trust standards, and dedicated 24/7 support for creators and marketing agencies.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: "About Us — Intopsmm SMM Panel" },
      {
        property: "og:description",
        content: "Discover how Intopsmm delivers wholesale SMM services with 99.9% uptime and instant automated delivery.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_CONFIG.siteUrl}/about` },
      { property: "og:image", content: `${SITE_CONFIG.siteUrl}/favicon.png` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_CONFIG.siteUrl}/about` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "About", path: "/about" },
          ]),
        ),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const pillars = [
    {
      icon: Zap,
      title: "Real-Time Automation",
      desc: "Direct integration with global provider servers ensures orders initiate within seconds without human delay.",
    },
    {
      icon: ShieldCheck,
      title: "Account Safety First",
      desc: "Zero password policy. All deliveries operate within platform API rate limits with gradual pacing.",
    },
    {
      icon: Users,
      title: "10,000+ Active Clients",
      desc: "Trusted by independent content creators, music artists, digital marketing agencies, and reseller panels.",
    },
    {
      icon: Globe2,
      title: "Transparent INR Pricing",
      desc: "Instant 0% fee UPI QR deposits with clear per-thousand unit rates and automated balance management.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* Hero */}
      <section className="border-b border-border/40 bg-gradient-to-b from-primary/10 via-background to-background px-4 pb-14 pt-10 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Built for Creators & Agencies
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Powering Digital Growth Across India & Worldwide
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Intopsmm was founded with a singular objective: to eliminate overpriced, slow, and unreliable social media
            marketing services by providing direct, automated, wholesale server access.
          </p>
        </div>
      </section>

      {/* Story and Mission */}
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Our Mission & Infrastructure</h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              In today’s hyper-competitive social ecosystem, algorithmic discoverability requires momentum. Without
              initial engagement and social proof, even outstanding content can remain unseen.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              At Intopsmm, we engineer direct provider pipelines that deliver high-retention followers, views, likes, and
              watch hours with surgical precision. We prioritize account security, transparent order status tracking, and
              instant UPI deposit integrations.
            </p>

            <div className="mt-6 space-y-2.5">
              {[
                "Zero password requirements on all social services",
                "Instant automated order validation and refund fallbacks",
                "Dedicated human support team available 24/7 on WhatsApp",
                "Regular server upgrades and non-drop algorithm enhancements",
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {pillars.map((pil, idx) => (
              <Card key={idx} className="border-border/60 p-5 shadow-card bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <pil.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-foreground">{pil.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pil.desc}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA section */}
        <div className="mt-16 rounded-3xl border border-primary/30 bg-card p-8 text-center shadow-card sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to Accelerate Your Social Presence?</h2>
          <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground sm:text-sm">
            Create an account in less than 30 seconds and start placing orders with instant UPI funding.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-xl font-semibold shadow-md">
              <Link to="/register">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl font-semibold">
              <Link to="/services">Explore 1600+ Services</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
