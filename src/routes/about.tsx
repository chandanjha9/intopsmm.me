import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Globe2,
  Headphones,
  Layers,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Nav, Footer } from "@/routes/index";
import { SITE_CONFIG } from "@/lib/seo/site-config";
import { getBreadcrumbSchema, getOrganizationSchema } from "@/lib/seo/schema";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Intopsmm — India's Premier SMM Growth Partner" },
      {
        name: "description",
        content:
          "Discover Intopsmm: India's high-speed automated SMM panel. Explore our services, mission, target audience, 4-step workflow, and 24/7 customer support desk.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: "About Intopsmm — India's Premier SMM Growth Partner" },
      {
        property: "og:description",
        content:
          "Learn how Intopsmm provides wholesale SMM services with 99.9% uptime, instant automated delivery, and 24/7 WhatsApp support.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_CONFIG.siteUrl}/about` },
      { property: "og:image", content: `${SITE_CONFIG.siteUrl}/favicon.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "About Intopsmm — India's Premier SMM Growth Partner" },
      { name: "twitter:description", content: "Learn about Intopsmm's automated SMM platform, services, and support." },
      { name: "twitter:image", content: `${SITE_CONFIG.siteUrl}/favicon.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_CONFIG.siteUrl}/about` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            getBreadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "About", path: "/about" },
            ]),
            getOrganizationSchema(),
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

export function AboutPage() {
  const audience = [
    {
      title: "Content Creators & Influencers",
      desc: "Accelerate organic algorithmic reach across Instagram, YouTube, and TikTok with high-retention engagement and initial social proof.",
      icon: Users,
    },
    {
      title: "Digital Marketing Agencies",
      desc: "Deliver client campaigns seamlessly with bulk ordering, wholesale INR pricing, reliable refill guarantees, and priority server routing.",
      icon: Layers,
    },
    {
      title: "SMM Resellers & Panel Owners",
      desc: "Connect your existing website via standard REST API to automate order forwarding, sync real-time service rates, and scale effortlessly.",
      icon: Zap,
    },
    {
      title: "Businesses & E-Commerce Brands",
      desc: "Build instant brand credibility and buyer trust on social profiles to improve ad conversion rates and customer engagement.",
      icon: ShieldCheck,
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Create a Free Account",
      desc: "Register in under 30 seconds with just your email and password. No credit card or sensitive details required.",
    },
    {
      step: "02",
      title: "Add Funds via Instant UPI",
      desc: "Scan the automated dynamic UPI QR code with PhonePe, Google Pay, or Paytm for instant 0% fee wallet credit.",
    },
    {
      step: "03",
      title: "Select Service & Enter Public Link",
      desc: "Choose from 1,600+ high-quality services and enter your public profile or post link. We never ask for account passwords.",
    },
    {
      step: "04",
      title: "Instant Automated Delivery",
      desc: "Our high-speed API servers initiate order processing within minutes, providing real-time tracking and refill guarantees.",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* Hero Header */}
      <section className="border-b border-border/40 bg-gradient-to-b from-primary/10 via-background to-background px-4 pb-14 pt-10 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> India's Trusted Growth Platform
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            About Intopsmm — India's Premier SMM Growth Partner
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Intopsmm is an automated Social Media Marketing (SMM) platform engineered to empower creators, brands, and marketing agencies with direct, wholesale access to high-retention social signals.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 space-y-16">
        {/* Section 1: What Intopsmm Is */}
        <section aria-labelledby="what-is-intopsmm">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">Company Background</span>
              <h2 id="what-is-intopsmm" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                What is Intopsmm?
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                <strong>Intopsmm</strong> is an enterprise-grade automated social media marketing platform based in India. Founded to solve the frustrations of slow delivery, overpriced intermediaries, and poor customer support, Intopsmm connects directly to high-capacity global server clusters.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Whether you need to boost visibility on an Instagram Reel, reach the YouTube Partner Program threshold of 4,000 public watch hours, or scale a Telegram community, Intopsmm delivers verified, algorithm-safe engagement at wholesale rates.
              </p>
              <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2 rounded-lg bg-card border border-border p-2.5">
                  <Clock className="h-4 w-4 text-primary" /> 99.9% Automated Uptime
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-card border border-border p-2.5">
                  <ShieldCheck className="h-4 w-4 text-primary" /> 100% Password-Free
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-card border border-border p-2.5">
                  <Globe2 className="h-4 w-4 text-primary" /> Worldwide & Indian Targeting
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-card">
              <h3 className="text-lg font-bold">The Intopsmm Difference</h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Zero Password Policy:</strong> We strictly require only your public profile or post URL. Your account credentials are never asked for.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Transparent INR Wallet:</strong> Instant 0% fee UPI QR code deposits (PhonePe, GPay, Paytm) with automated transaction verification.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Automated Refill Protection:</strong> Refill-supported services guarantee count restoration in the event of platform drops within 30 to 365 days.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span><strong>Direct Reseller API:</strong> RESTful API with JSON responses compatible with standard SMM panel software.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: What Services Intopsmm Provides */}
        <section aria-labelledby="services-provided" className="border-t border-border/60 pt-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Service Catalogue</span>
            <h2 id="services-provided" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              What Services Intopsmm Provides
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Over 1,600 tailored social media marketing services with live pricing, gradual delivery options, and instant automated dispatch.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Instagram Services", desc: "Followers, post likes, high-retention reels views, story views, and automatic comments.", link: "/services/instagram" },
              { title: "YouTube Growth", desc: "Monetization-safe 4000 watch hours, high-retention video views, subscribers, and live stream viewers.", link: "/services/youtube" },
              { title: "Telegram Services", desc: "Zero-drop silent channel members, automated multi-post views, emoji reactions, and group members.", link: "/services/telegram" },
              { title: "TikTok Promotion", desc: "FYP algorithmic push views, real profile followers, viral likes, shares, and favorites.", link: "/services/tiktok" },
              { title: "Facebook Growth", desc: "Business page likes, creator profile followers, reels views, and group member additions.", link: "/services/facebook" },
              { title: "Twitter / X Marketing", desc: "Followers with realistic bios, retweets, tweet likes, bookmarks, and fast poll votes.", link: "/services/twitter" },
            ].map((srv, idx) => (
              <Card key={idx} className="border-border/70 p-5 shadow-card bg-card hover:border-primary/50 transition">
                <h3 className="text-base font-bold text-foreground">{srv.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{srv.desc}</p>
                <Link to={srv.link} className="mt-4 inline-flex items-center text-xs font-semibold text-primary hover:underline">
                  View {srv.title} →
                </Link>
              </Card>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button asChild variant="outline" size="sm">
              <Link to="/services">Browse Complete 1600+ Services Price List</Link>
            </Button>
          </div>
        </section>

        {/* Section 3: Who the Platform is Designed For */}
        <section aria-labelledby="target-audience" className="border-t border-border/60 pt-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Target Audience</span>
            <h2 id="target-audience" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Who Intopsmm is Designed For
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Whether you are an individual content creator or a high-volume agency, our platform is built to cater to your specific growth needs.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {audience.map((aud, idx) => (
              <Card key={idx} className="border-border/70 p-6 shadow-card bg-card flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <aud.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-foreground">{aud.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{aud.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 4: How the Platform Works */}
        <section aria-labelledby="how-it-works" className="border-t border-border/60 pt-12">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Simple 4-Step Workflow</span>
            <h2 id="how-it-works" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              How Intopsmm Works
            </h2>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Getting started takes less than two minutes. Follow these four straightforward steps to place your first order.
            </p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {workflowSteps.map((w, idx) => (
              <div key={idx} className="relative rounded-2xl border border-border/70 bg-card p-6 shadow-card">
                <span className="text-3xl font-extrabold text-primary/30">{w.step}</span>
                <h3 className="mt-3 text-base font-bold text-foreground">{w.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{w.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Support Information */}
        <section aria-labelledby="support-info" className="border-t border-border/60 pt-12">
          <div className="rounded-3xl border border-primary/30 bg-card p-8 sm:p-12 shadow-card">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Customer Care</span>
                <h2 id="support-info" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Dedicated 24/7 Human Support
                </h2>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  We believe that great software is only as good as the support behind it. The Intopsmm help desk operates around the clock, 365 days a year, to assist with order tracking, custom requirements, and payment confirmations.
                </p>
                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span><strong>WhatsApp Live:</strong> <a href={SITE_CONFIG.whatsappLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{SITE_CONFIG.supportPhone}</a></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Headphones className="h-5 w-5 text-primary" />
                    <span><strong>Email Desk:</strong> <a href={`mailto:${SITE_CONFIG.email}`} className="text-primary hover:underline">{SITE_CONFIG.email}</a></span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <span><strong>Operating Hours:</strong> 24 Hours a Day, 7 Days a Week</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 text-center sm:text-left">
                <div className="rounded-xl border border-border bg-background p-5">
                  <h3 className="text-sm font-bold">Have Questions Before Ordering?</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Check our extensive knowledge base and FAQ section for answers to common questions.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link to="/faq">Read FAQ</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link to="/contact">Contact Support</Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
                  <h3 className="text-sm font-bold text-primary">Ready to Scale with Intopsmm?</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Register your free account today and experience why over 10,000 clients trust Intopsmm.
                  </p>
                  <Button asChild size="sm" className="mt-4 font-semibold">
                    <Link to="/register">
                      Create Free Account <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
