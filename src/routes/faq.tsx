import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, HelpCircle, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Nav, Footer } from "@/routes/index";
import { SITE_CONFIG } from "@/lib/seo/site-config";
import { getBreadcrumbSchema, getFaqSchema } from "@/lib/seo/schema";

const GENERAL_FAQS = [
  {
    category: "General",
    q: "What is Intopsmm and how does an SMM panel work?",
    a: "Intopsmm is India's premier automated Social Media Marketing (SMM) platform. We provide creators, businesses, and digital agencies with wholesale social growth services—including followers, views, likes, watch hours, and engagement—delivered instantly through high-speed automated server connections.",
  },
  {
    category: "General",
    q: "Are my social media accounts safe when using Intopsmm?",
    a: "Absolutely 100% safe. We never ask for your account password or admin credentials. All orders operate using public profile links or post URLs, fully aligned with platform algorithm pacing to safeguard your profile integrity.",
  },
  {
    category: "Orders & Delivery",
    q: "How fast do orders start and complete?",
    a: "Most orders initiate automatically within 0 to 5 minutes of submission. Completion speed depends on the total quantity and the specific service server chosen. Speeds and daily limits are transparently displayed in our service descriptions.",
  },
  {
    category: "Orders & Delivery",
    q: "What does 'Refill Guarantee' mean?",
    a: "Social media platforms occasionally audit inactive accounts. Services designated with a 'Refill Guarantee' protect your investment. If a drop occurs within the refill warranty window (typically 30 to 365 days), you can click 'Refill' in your dashboard to have the count restored automatically at no extra charge.",
  },
  {
    category: "Payments & Balance",
    q: "What payment methods do you accept?",
    a: "We support instant Automatic UPI QR Code deposits (PhonePe, Google Pay, Paytm, BHIM, Cred) with 0% transaction fees. We also support manual bank transfers and international cryptocurrency payments upon request.",
  },
  {
    category: "Payments & Balance",
    q: "What happens if an order fails or cannot be delivered?",
    a: "Our automated backend system continuously monitors order fulfillment. If an order fails or is canceled by the provider, the exact remaining charge is automatically credited back to your Intopsmm wallet balance instantly.",
  },
  {
    category: "API & Resellers",
    q: "Can I connect my own website or panel using your API?",
    a: "Yes! Intopsmm offers full REST API compatibility with standard SMM panel formats. Resellers can automate orders, check service rates, and sync order statuses directly into their own systems.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Frequently Asked Questions (FAQ) — Intopsmm SMM Panel" },
      {
        name: "description",
        content:
          "Find answers to common questions about Intopsmm SMM services, delivery speed, refill guarantee, UPI payments, account safety, and API integration.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: "Frequently Asked Questions — Intopsmm SMM Panel" },
      {
        property: "og:description",
        content: "Everything you need to know about placing orders, UPI payments, refill warranties and delivery times.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_CONFIG.siteUrl}/faq` },
      { property: "og:image", content: `${SITE_CONFIG.siteUrl}/og-image.jpg` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_CONFIG.siteUrl}/faq` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            getBreadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "FAQ", path: "/faq" },
            ]),
            getFaqSchema(GENERAL_FAQS),
          ],
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("All");

  const categories = ["All", "General", "Orders & Delivery", "Payments & Balance", "API & Resellers"];

  const filtered = GENERAL_FAQS.filter((f) => {
    const matchCat = activeCat === "All" || f.category === activeCat;
    const q = search.trim().toLowerCase();
    const matchQ = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      <section className="border-b border-border/40 bg-gradient-to-b from-primary/10 via-background to-background px-4 pb-14 pt-10 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <HelpCircle className="h-3.5 w-3.5" /> Help & Support Center
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Find immediate answers regarding our automated SMM services, refill policies, instant UPI deposit methods,
            and safety protocols.
          </p>

          <div className="mx-auto mt-8 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search any question or keyword…"
                className="h-11 rounded-xl pl-10 text-sm shadow-sm"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                  activeCat === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/70 bg-card text-muted-foreground hover:border-primary hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-3">
          {filtered.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Card
                key={idx}
                className="overflow-hidden border-border/60 bg-card transition shadow-sm hover:border-primary/40"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left transition"
                >
                  <span className="text-sm sm:text-base font-semibold text-foreground pr-4">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-primary" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-border/40 px-5 pb-5 pt-3 text-xs sm:text-sm leading-relaxed text-muted-foreground animate-in fade-in">
                    {item.a}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Contact fallback */}
        <div className="mt-14 rounded-2xl border border-border/60 bg-card p-6 text-center shadow-card sm:p-8">
          <h2 className="text-lg font-bold text-foreground">Still have questions?</h2>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            Our expert support team is available 24/7 on WhatsApp and email to assist you.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button asChild size="sm" className="rounded-xl font-semibold">
              <a href={SITE_CONFIG.whatsappLink} target="_blank" rel="noopener noreferrer">
                WhatsApp Support
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl font-semibold">
              <Link to="/contact">Contact Page</Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
