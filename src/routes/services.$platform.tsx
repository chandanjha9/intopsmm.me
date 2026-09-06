import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPublicServices } from "@/lib/services-public.functions";
import { Nav, Footer } from "@/routes/index";
import { SITE_CONFIG } from "@/lib/seo/site-config";
import { getBreadcrumbSchema, getFaqSchema, getServiceSchema } from "@/lib/seo/schema";

interface PlatformDetails {
  name: string;
  slug: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  features: string[];
  faqs: Array<{ q: string; a: string }>;
}

const PLATFORMS_DATA: Record<string, PlatformDetails> = {
  instagram: {
    name: "Instagram",
    slug: "instagram",
    headline: "Cheapest Instagram SMM Panel Services in India",
    metaTitle: "Buy Instagram Followers, Likes, Views & Reels Boost — Intopsmm",
    metaDescription:
      "Scale your Instagram with instant delivery followers, real likes, high-retention video views, and reels engagement at unbeatable INR prices with refill guarantee.",
    intro:
      "Boost your Instagram profile with India's #1 automated SMM panel. We offer instant delivery followers, active post likes, reels views, story views, and impressions designed to elevate your algorithmic reach without password requirements.",
    features: [
      "Instant 0-5 Minute Order Processing",
      "High-Retention & Non-Drop Followers Available",
      "30 to 365 Days Automatic Refill Guarantee",
      "Safe Algorithm-Compliant Gradual Delivery",
    ],
    faqs: [
      {
        q: "Are your Instagram SMM services safe for my account?",
        a: "Yes. All our services operate strictly within Instagram's rate limits and do not require your account password. Only your public username or post link is needed.",
      },
      {
        q: "How fast do Instagram followers and likes deliver?",
        a: "Most Instagram orders initiate within 1-5 minutes of placement. Larger orders are delivered with gradual pacing to simulate organic social growth.",
      },
      {
        q: "What happens if followers drop after purchase?",
        a: "Services marked with 'Refill Supported' include an automated 30 to 365 days refill guarantee. You can trigger refill directly from your dashboard.",
      },
    ],
  },
  youtube: {
    name: "YouTube",
    slug: "youtube",
    headline: "Fast & Monetization-Safe YouTube SMM Panel Services",
    metaTitle: "Buy YouTube Views, Subscribers & 4000 Watch Hours — Intopsmm",
    metaDescription:
      "Achieve YouTube monetization with 4000 watch hours, genuine subscribers, high-retention video views, and live stream viewers at cheap wholesale rates.",
    intro:
      "Supercharge your YouTube channel growth with proven, monetization-friendly SMM services. Accelerate reaching the 1,000 subscribers and 4,000 public watch hours thresholds with high-retention servers and instant start times.",
    features: [
      "High-Retention Views with Long Audience Retention",
      "Monetization-Eligible 4000 Watch Hours Packages",
      "Lifetime Non-Drop Guarantee on Premium Servers",
      "Fast 24/7 Live Stream Viewer Support",
    ],
    faqs: [
      {
        q: "Can I monetize my channel using YouTube watch hours and views?",
        a: "Yes! Our watch hours and high-retention view servers are fully compliant with YouTube's public watch hour counting criteria.",
      },
      {
        q: "Do you need channel manager or password access?",
        a: "Never. We only require your public video link or channel URL.",
      },
    ],
  },
  telegram: {
    name: "Telegram",
    slug: "telegram",
    headline: "High-Capacity Telegram Channel Members & Post Views",
    metaTitle: "Buy Telegram Channel Members & Views [Auto Multi-Post] — Intopsmm",
    metaDescription:
      "Boost Telegram channels with non-drop real members, multi-post views, reactions, and channel booster upgrades with instant delivery.",
    intro:
      "Grow your Telegram community authority instantly. Choose from silent members, multi-post automated views, custom emoji reactions, and channel boost services to attract organic members.",
    features: [
      "Zero Drop Silent & Active Channel Members",
      "Automatic Multi-Post Views Across Recent Updates",
      "Emoji Reactions & Custom Interactions",
      "Speed Up to 100K+ Members per Day",
    ],
    faqs: [
      {
        q: "How do Telegram multi-post views work?",
        a: "When you purchase multi-post views, our server distributes views across your last 5 to 50 channel posts automatically to simulate natural community reading activity.",
      },
      {
        q: "Can I add members to private Telegram channels?",
        a: "Yes, you can provide an active public or private invite link when creating your order.",
      },
    ],
  },
  facebook: {
    name: "Facebook",
    slug: "facebook",
    headline: "Wholesale Facebook Page Likes, Followers & Video Views",
    metaTitle: "Buy Facebook Page Likes, Followers & Group Members — Intopsmm",
    metaDescription:
      "Enhance Facebook business page credibility with page likes, profile followers, video views, and post shares at lowest wholesale rates in India.",
    intro:
      "Scale Facebook business pages, creator profiles, and groups with instant engagement. Enhance credibility, improve reach, and convert profile visitors into paying customers.",
    features: [
      "Worldwide and Indian Targeted Page Followers",
      "Facebook Reels & Video Monetization Views",
      "Active Group Member Additions",
      "Safe Real-Profile Engagement Signals",
    ],
    faqs: [
      {
        q: "Will Facebook page likes help my organic reach?",
        a: "Yes. Having a solid baseline of page followers provides immediate social proof that increases conversion rates from organic visitors.",
      },
    ],
  },
  tiktok: {
    name: "TikTok",
    slug: "tiktok",
    headline: "Viral TikTok Views, Followers, Likes & Shares",
    metaTitle: "Buy TikTok Views, Followers & Shares for FYP Viral Reach — Intopsmm",
    metaDescription:
      "Push your TikTok videos to the For You page with instant high-retention views, profile followers, shares, and likes at competitive prices.",
    intro:
      "Trigger the TikTok FYP recommendation engine with fast engagement signals. Boost completion rates with high-retention views, favorites, and shares.",
    features: [
      "High-Retention Views to Trigger Completion Rate Boosts",
      "Real Looking Profile Followers with Fast Start",
      "Shares and Favorites for Maximum Algorithmic Reach",
      "Instant 24/7 Automated Delivery",
    ],
    faqs: [
      {
        q: "How fast do TikTok views start?",
        a: "TikTok views start almost instantaneously within 30 to 120 seconds of order submission.",
      },
    ],
  },
  twitter: {
    name: "Twitter / X",
    slug: "twitter",
    headline: "Twitter / X Followers, Retweets & Impressions",
    metaTitle: "Buy Twitter / X Followers, Retweets & Poll Votes — Intopsmm",
    metaDescription:
      "Grow your Twitter / X presence with active followers, retweets, tweet likes, and poll votes with instant delivery.",
    intro:
      "Establish immediate authority on Twitter / X. Boost tweets with retweets, quotes, likes, and targeted followers designed for brands, Web3 projects, and creators.",
    features: [
      "Profile Followers with Realistic Bios and Avatars",
      "Fast Tweet Retweets & Bookmarks",
      "Poll Votes with Custom Option Selection",
      "Automated Order Tracking",
    ],
    faqs: [
      {
        q: "Do you support Twitter poll votes?",
        a: "Yes, we support instant poll votes where you specify the exact poll option number during order placement.",
      },
    ],
  },
};

export const Route = createFileRoute("/services/$platform")({
  head: ({ params }) => {
    const platformParam = (params as { platform?: string }).platform || "all";
    const key = platformParam.toLowerCase();
    const info = PLATFORMS_DATA[key];
    const brand = SITE_CONFIG.brand;
    const title = info ? `${info.metaTitle} | ${brand}` : `SMM Services | ${brand}`;
    const description = info ? info.metaDescription : SITE_CONFIG.defaultDescription;
    const canonical = `${SITE_CONFIG.siteUrl}/services/${key}`;
    const ogImage = `${SITE_CONFIG.siteUrl}/favicon.png`;

    const breadcrumbs = [
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
      { name: info ? info.name : platformParam, path: `/services/${key}` },
    ];

    const schemas = [
      getBreadcrumbSchema(breadcrumbs),
      info
        ? getServiceSchema({
            name: `${info.name} SMM Services`,
            description: info.metaDescription,
            path: `/services/${key}`,
          })
        : null,
      info ? getFaqSchema(info.faqs) : null,
    ].filter(Boolean);

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { property: "og:image", content: ogImage },
        { property: "og:site_name", content: brand },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: ogImage },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": schemas,
          }),
        },
      ],
    };
  },
  component: PlatformServicesPage,
});

function money(v: number) {
  return `₹ ${v.toFixed(4)}`;
}

function PlatformServicesPage() {
  const { platform } = Route.useParams() as { platform: string };
  const platformKey = (platform || "").toLowerCase();
  const info = PLATFORMS_DATA[platformKey];

  const fetchServices = useServerFn(listPublicServices);
  const { data, isLoading } = useQuery({
    queryKey: ["public-services"],
    queryFn: () => fetchServices(),
    staleTime: 5 * 60 * 1000,
  });

  const [query, setQuery] = useState("");

  const allServices = data?.services ?? [];
  const platformServices = useMemo(() => {
    return allServices.filter((s) => {
      const matchPlat = (s.platform ?? "").toLowerCase() === platformKey;
      const matchCat = s.category.toLowerCase().includes(platformKey);
      const matchName = s.name.toLowerCase().includes(platformKey);
      return matchPlat || matchCat || matchName;
    });
  }, [allServices, platformKey]);

  const filtered = useMemo(() => {
    if (!query.trim()) return platformServices;
    const q = query.trim().toLowerCase();
    return platformServices.filter(
      (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
    );
  }, [platformServices, query]);

  if (!info && platformServices.length === 0 && !isLoading) {
    throw notFound();
  }

  const displayName = info ? info.name : platform.charAt(0).toUpperCase() + platform.slice(1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* Hero Header */}
      <section className="border-b border-border/40 bg-gradient-to-b from-primary/10 via-background to-background px-4 pb-14 pt-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Breadcrumb Navigation */}
          <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/services" className="hover:text-foreground">
              Services
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-foreground">{displayName}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Direct Wholesale Provider
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-500">
              <Zap className="h-3.5 w-3.5" /> Instant Delivery
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            {info ? info.headline : `${displayName} SMM Panel Services`}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {info ? info.intro : `Explore our curated wholesale ${displayName} services with real-time delivery and automated order status tracking.`}
          </p>

          {/* Value Highlights */}
          {info?.features && (
            <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {info.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-2.5 text-xs font-medium shadow-sm backdrop-blur"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Services Catalogue */}
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Available {displayName} Services</h2>
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} active service{filtered.length === 1 ? "" : "s"} priced in INR per 1,000 units.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${displayName} services…`}
              className="h-10 pl-9 text-xs"
            />
          </div>
        </div>

        {/* Live Service Cards / Table */}
        <div className="mt-6 space-y-3">
          {isLoading && (
            <div className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
              Loading latest live prices from servers…
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-8 text-center text-sm text-muted-foreground">
              No matching services found. Try adjusting your search query.
            </div>
          )}

          {filtered.map((s) => (
            <Card
              key={s.id}
              className="flex flex-col justify-between gap-4 border-border/60 p-4 shadow-sm transition hover:border-primary/50 sm:flex-row sm:items-center"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    #{s.id.slice(0, 8)}
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {s.category}
                  </span>
                  {s.refill_supported && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-500">
                      <RefreshCcw className="h-2.5 w-2.5" /> Refill
                    </span>
                  )}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-foreground tracking-tight">{s.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Min: {s.min_quantity.toLocaleString()} · Max: {s.max_quantity.toLocaleString()}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center">
                <div className="text-left sm:text-right">
                  <span className="text-xs text-muted-foreground block">Rate / 1000</span>
                  <span className="text-base font-bold text-primary">{money(s.selling_rate)}</span>
                </div>
                <Button size="sm" asChild className="h-8 rounded-lg text-xs font-semibold">
                  <Link to="/register">Order Now</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Platform FAQs */}
        {info?.faqs && info.faqs.length > 0 && (
          <section className="mt-16 rounded-2xl border border-border/60 bg-card p-6 shadow-card sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest">
              <HelpCircle className="h-4 w-4" /> Frequently Asked Questions
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Got Questions About {displayName}?</h2>
            <div className="mt-6 space-y-4">
              {info.faqs.map((faq, idx) => (
                <div key={idx} className="rounded-xl border border-border/60 bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-foreground">{faq.q}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Other Platform Links (Internal Linking) */}
        <section className="mt-12">
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Explore Other Platforms
          </h3>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PLATFORMS_DATA)
              .filter((k) => k !== platformKey)
              .map((pKey) => (
                <Link
                  key={pKey}
                  to={`/services/${pKey}` as any}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3.5 py-2 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary shadow-sm"
                >
                  <span>{PLATFORMS_DATA[pKey].name} Services</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </Link>
              ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
