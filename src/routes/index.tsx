import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/ui/Logo";
import { isFirebaseConfigured } from "@/lib/firebase";
import featureFollowers from "@/assets/feature-followers.jpg";
import featureEngagement from "@/assets/feature-engagement.jpg";
import featurePricing from "@/assets/feature-pricing.jpg";
import {
  Rocket,
  ShieldCheck,
  Zap,
  Wallet,
  Headphones,
  Code2,
  ArrowRight,
  Check,
  X as XIcon,
  TrendingUp,
  Users,
  Globe2,
  Star,
  BarChart3,
  Clock,
  Menu,
  X,
  Sparkles,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  Music2,
  MessageCircle,
  Linkedin,
  ListChecks,
  LifeBuoy,
  Network,
  Crown,
  CreditCard,
  HelpCircle,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Intopsmm — Cheapest & Fastest SMM Panel Services" },
      {
        name: "description",
        content:
          "Intopsmm is a fast, secure and fully automated SMM panel. 1600+ services, instant delivery, INR payments and 24/7 expert support.",
      },
      { property: "og:title", content: "Intopsmm — Cheapest & Fastest SMM Panel Services" },
      {
        property: "og:description",
        content:
          "1600+ high-quality services, instant delivery, secure INR payments and 24/7 support for creators, agencies and resellers.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://growmesmm.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://growmesmm.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: Object.values(faqTabs)
            .flat()
            .map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-page-tint text-foreground">
      <Nav />
      <Hero />
      <TagStrip />
      <WhyChoose />
      <InsightCards />
      <BestSelling />
      <NumbersCard />
      <VsOthers />
      <Clientele />
      <Steps />
      <Testimonials />
      <FeatureSplits />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

/* ---------------- NAV ---------------- */
function Nav() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "#home", label: "Home" },
    { href: "#services", label: "Services" },
    { href: "#why", label: "Why us" },
    { href: "#steps", label: "How it works" },
    { href: "#faq", label: "FAQ" },
    { href: "#contact", label: "Contact" },
  ];
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center">
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="hero" size="sm">
              <Link to="/register">
                Get Started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <button
            aria-label="Toggle menu"
            className="md:hidden rounded-md p-2 hover:bg-accent"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="md:hidden border-t border-border/60 px-4 py-4">
            <div className="flex flex-col gap-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link to="/login">Login</Link>
                </Button>
                <Button asChild variant="hero" size="sm" className="flex-1">
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------------- SECTION HEADING ---------------- */
function SectionHeading({
  before,
  highlight,
  after,
  sub,
}: {
  before?: string;
  highlight?: string;
  after?: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
        {before}
        {highlight && <span className="gradient-text">{highlight}</span>}
        {after}
      </h2>
      {sub && <p className="mt-3 text-base text-muted-foreground">{sub}</p>}
    </div>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section id="home" className="relative overflow-hidden px-4 pb-16 pt-16 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-20 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl" />
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "linear-gradient(to right, oklch(0.72 0.19 148 / 0.12) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.72 0.19 148 / 0.12) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
            <Globe2 className="h-3.5 w-3.5" /> #1 Best SMM Panel
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            Intopsmm — The Fastest &amp; Cheapest{" "}
            <span className="gradient-complementary-text">SMM Panel</span> for Social Media Growth
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted-foreground lg:text-foreground/75">
            Boost your social media game and dominate the digital world with{" "}
            <b className="text-foreground">Intopsmm</b> — your trusted partner for unbeatable growth
            strategies and professional support.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild variant="hero" size="lg">
              <Link to="/register">
                <Sparkles className="mr-2 h-4 w-4" /> Get Started Free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="bg-white/10">
              <a href="#services">
                <BarChart3 className="mr-2 h-4 w-4" /> View Services
              </a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground lg:justify-start">
            <span className="before:mr-2 before:text-complementary before:content-['•']">
              50,000+ Customers
            </span>
            <span className="before:mr-2 before:text-complementary before:content-['•']">
              Secure Payments
            </span>
            <span className="before:mr-2 before:text-complementary before:content-['•']">
              Instant Delivery
            </span>
          </div>
        </div>
        <LandingLoginCard />
      </div>
    </section>
  );
}

function LandingLoginCard() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Please enter username/email and password.");
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      toast.info("Google Sign-In is coming soon! Please sign in with username/email and password.");
      return;
    }
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      if (!message.includes("popup-closed") && !message.includes("cancelled")) {
        setError(message);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Card className="mx-auto w-full max-w-[420px] rounded-[1.75rem] border-white/80 bg-white p-8 shadow-[0_25px_70px_-35px_rgba(15,23,42,0.45)] sm:p-9">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Welcome Back 👋</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Sign up free
          </Link>
        </p>
      </div>

      <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label
            htmlFor="landing-username"
            className="text-xs font-bold uppercase tracking-widest text-foreground/70"
          >
            Username
          </Label>
          <Input
            id="landing-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Your username"
            className="h-11 rounded-xl border-primary/20 bg-accent/30 px-4"
            disabled={submitting || googleLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="landing-password"
              className="text-xs font-bold uppercase tracking-widest text-foreground/70"
            >
              Password
            </Label>
          </div>
          <div className="relative">
            <Input
              id="landing-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-xl border-primary/20 bg-accent/30 px-4 pr-28"
              disabled={submitting || googleLoading}
            />
            <Link
              to="/forgot-password"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-primary hover:underline"
            >
              Password Lost?
            </Link>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox id="landing-remember" /> Remember me
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
          className="h-12 w-full text-base font-extrabold"
          disabled={submitting || googleLoading}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <div className="relative my-6 flex items-center gap-3">
        <div className="flex-1 border-t border-border" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full gap-2 rounded-xl bg-white shadow-soft"
        onClick={handleGoogleLogin}
        disabled={googleLoading || submitting}
      >
        {googleLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <GoogleMark className="h-4 w-4" />
        )}
        Continue with Google
      </Button>
    </Card>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.7c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.7 14.7 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.6-5.9l-7.6-5.9c-2 1.4-4.8 2.4-8 2.4-6.4 0-11.7-3.8-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

/* ---------------- TAG STRIP ---------------- */
const tags = [
  { label: "13,394,499+ Orders Completed", tone: "primary" },
  { label: "24/7 Customer Support", tone: "complementary" },
  { label: "Multiple payment methods", tone: "primary" },
  { label: "9.9/10 satisfaction", tone: "complementary" },
  { label: "Distributor panel", tone: "complementary" },
  { label: "1644 high-quality and affordable services", tone: "primary" },
  { label: "+200K happy customers", tone: "complementary" },
  { label: "Reference system", tone: "primary" },
];

function TagStrip() {
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading highlight="Discover the Benefits of Using the Best SMM Panel" after="!" />
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {tags.map((t, i) => (
            <span
              key={t.label}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${
                t.tone === "primary"
                  ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                  : t.tone === "complementary"
                    ? "bg-[image:var(--gradient-complementary)] text-complementary-foreground shadow-complementary"
                    : "border border-border/60 bg-card text-muted-foreground"
              } ${i % 3 === 0 ? "-rotate-2" : i % 3 === 1 ? "rotate-1" : ""}`}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- WHY CHOOSE ---------------- */
function WhyChoose() {
  const small = [
    {
      Icon: Headphones,
      title: "24/7 Customer Support",
      text: "Always here for you. Get instant, round-the-clock assistance from our expert team, ensuring your needs are met any time of day or night for a seamless experience.",
    },
    {
      Icon: Wallet,
      title: "Affordable Pricing",
      text: "Affordable pricing that doesn't cut corners on quality. Experience premium services at prices that fit your budget, ensuring you get the best value every time.",
    },
    {
      Icon: Globe2,
      title: "Wide Range of Services",
      text: "Our panel offers a comprehensive range of services, from Facebook likes to YouTube views, to boost your social media presence on any platform.",
    },
  ];
  return (
    <section id="why" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading before="Why Choose " highlight="Intopsmm" after="?" />
        <Card className="glass mt-10 grid items-center gap-6 border-border/60 p-8 shadow-card md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <h3 className="text-2xl font-bold">Swift and Seamless Solutions</h3>
            <p className="mt-3 text-muted-foreground">
              Intopsmm provides rapid ROI delivery. Experience instant impact with our swift and
              seamless automated solutions.
            </p>
          </div>
          <div className="grid h-40 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow">
            <Rocket className="h-16 w-16" />
          </div>
        </Card>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {small.map(({ Icon, title, text }) => (
            <Card key={title} className="glass border-border/60 p-6 shadow-card">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- INSIGHT CARDS ---------------- */
function InsightCards() {
  const cards = [
    {
      title:
        "At Intopsmm, we proudly serve a global clientele. Here are the main regions where our clients are located:",
      text: "Intopsmm is highly regarded across South Asia, where India, Pakistan, Bangladesh and Sri Lanka frequently use our SMM panel services. We also serve a large number of clients in the USA, Canada, Brazil, Germany, UK, France, Russia and the UAE, along with Indonesia, Philippines, Malaysia and Singapore.",
    },
    {
      title: "What is our USP?",
      text: "At Intopsmm we offer reliable, affordable and comprehensive SMM panel services designed to fuel your social media growth. Our platform provides tailored solutions for your unique needs, ensuring efficient and effective results. Whether you're growing on Instagram, YouTube, Facebook or any other platform, Intopsmm is your go-to resource.",
    },
    {
      title: "Why Choose Intopsmm?",
      text: "Intopsmm is your ultimate destination for top-notch SMM panel services: organic services, guaranteed services, campaign ad management and 24/7 support. We focus on result-oriented services that have a lasting impact, whichever platform you're scaling.",
    },
    {
      title: "SMM Services Insight",
      text: "Our commitment to excellence: our team of experts has the experience and knowledge to deliver top-quality SMM panel services at the most competitive prices. Proceed with confidence knowing Intopsmm has your social media marketing needs covered.",
    },
  ];
  return (
    <section className="bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.title} className="glass border-border/60 p-6 shadow-card">
            <h3 className="text-base font-bold leading-snug">{c.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ---------------- BEST SELLING ---------------- */
function BrandIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`grid h-14 w-14 place-items-center rounded-2xl text-white shadow-md ${className}`}
    >
      {children}
    </span>
  );
}

function InstagramLogo() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokLogo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-6.07a8.16 8.16 0 0 0 4.77 1.52v-3.5a4.85 4.85 0 0 1-1.04-.13z" />
    </svg>
  );
}

function YouTubeLogo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.81zM9.55 15.5V8.5l6.27 3.5-6.27 3.5z" />
    </svg>
  );
}

function FacebookLogo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function SpotifyLogo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function DiscordLogo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.338 1.225 1.994a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function XLogo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInLogo() {
  return (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function BestSelling() {
  const services = [
    {
      Icon: InstagramLogo,
      name: "Instagram Services",
      text: "Boost your Instagram with Intopsmm's top-tier, reliable and affordable SMM services.",
      iconClass: "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600",
    },
    {
      Icon: TikTokLogo,
      name: "TikTok Services",
      text: "Elevate your TikTok presence with Intopsmm's expert and cost-effective SMM services.",
      iconClass: "bg-black",
    },
    {
      Icon: YouTubeLogo,
      name: "YouTube Services",
      text: "Enhance your YouTube channel with Intopsmm's efficient and budget-friendly services.",
      iconClass: "bg-[#FF0000]",
    },
    {
      Icon: FacebookLogo,
      name: "Facebook Services",
      text: "Grow your Facebook with Intopsmm's expert, affordable and effective services.",
      iconClass: "bg-[#1877F2]",
    },
    {
      Icon: SpotifyLogo,
      name: "Spotify Services",
      text: "Amplify your Spotify presence with Intopsmm's affordable and powerful services.",
      iconClass: "bg-[#1DB954]",
    },
    {
      Icon: DiscordLogo,
      name: "Discord Services",
      text: "Secure your Discord server with Intopsmm's expert and budget-friendly services.",
      iconClass: "bg-[#5865F2]",
    },
    {
      Icon: XLogo,
      name: "Twitter Services",
      text: "Supercharge your Twitter growth with Intopsmm's unique, impactful services.",
      iconClass: "bg-black",
    },
    {
      Icon: LinkedInLogo,
      name: "LinkedIn Services",
      text: "Transform your LinkedIn presence with dynamic and strategic growth solutions.",
      iconClass: "bg-[#0A66C2]",
    },
  ];
  return (
    <section id="services" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading highlight="Intopsmm" after=" Best Selling Services" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ Icon, name, text, iconClass }) => (
            <Card key={name} className="glass flex flex-col border-border/60 p-6 shadow-card">
              <BrandIcon className={iconClass}>
                <Icon />
              </BrandIcon>
              <small className="mt-4 text-xs font-semibold uppercase tracking-widest text-primary">
                Starting from ₹16 / 1k
              </small>
              <h3 className="mt-2 text-base font-bold">{name}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{text}</p>
              <a
                href="#services"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                Check Services <ArrowRight className="h-4 w-4" />
              </a>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- NUMBERS ---------------- */
function NumbersCard() {
  const stats = [
    { Icon: Wallet, title: "Prices Starting From", value: "₹0.08 / 1k" },
    { Icon: BarChart3, title: "Orders Completed", value: "15,486,593+" },
    { Icon: Clock, title: "A new order is placed every", value: "0.14 sec" },
  ];
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Card className="border-border/60 bg-[image:var(--gradient-primary)] p-8 text-primary-foreground shadow-glow sm:p-12">
          <h2 className="text-3xl font-extrabold">Intopsmm by the Numbers</h2>
          <p className="mt-3 max-w-3xl text-sm opacity-90">
            We are proud to serve over 70 million active clients worldwide with more than 8,000
            active services. Our clients trust us for our commitment to quality and affordability,
            while our dedicated team ensures long-term results.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {stats.map(({ Icon, title, value }) => (
              <div
                key={title}
                className="flex items-center gap-4 rounded-2xl bg-white/10 p-5 backdrop-blur"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
                    {title}
                  </p>
                  <p className="mt-1 text-xl font-extrabold">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ---------------- VS OTHERS ---------------- */
function VsOthers() {
  const rows = [
    { Icon: Headphones, text: "Support › 24×7 professional customer support" },
    { Icon: ListChecks, text: "Service quality › High-quality services, real engagement" },
    { Icon: LifeBuoy, text: "Price › Cheapest price in the market" },
    { Icon: ShieldCheck, text: "Payment security › Secure transactions and data protection" },
    { Icon: Network, text: "Fast delivery › Fully automated order processing" },
    { Icon: Crown, text: "Friendly dashboard › The most user-friendly dashboard in the SMM world" },
  ];
  return (
    <section className="bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading before="Intopsmm vs " highlight="Others" />
        <div className="mt-10 space-y-3">
          {rows.map(({ Icon, text }) => (
            <Card
              key={text}
              className="glass flex flex-col gap-4 border-border/60 p-4 shadow-card sm:flex-row sm:items-center"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <small className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Feature
                </small>
                <p className="text-sm font-medium">{text}</p>
              </div>
              <div className="flex items-center gap-8 sm:ml-auto">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">Intopsmm</span>
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">Others</h3>
                  <XIcon className="h-5 w-5 text-destructive" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CLIENTELE ---------------- */
function Clientele() {
  const brands = ["TechMinds", "BrightIdeas", "TrendSetters", "PixelWave"];
  return (
    <section className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading highlight="Intopsmm" after=" leading the SMM industry for over 5 years!" />
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {brands.map((b) => (
            <span
              key={b}
              className="rounded-2xl border border-border/60 bg-card px-6 py-4 text-sm font-bold text-muted-foreground"
            >
              {b}
            </span>
          ))}
          <p className="text-sm font-semibold text-primary">+ Many More</p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- STEPS ---------------- */
function Steps() {
  const steps = [
    {
      title: "Register Account",
      text: "Sign up with your email, set a strong password and verify your account to get started with Intopsmm.",
    },
    {
      title: "Choose Service",
      text: "Browse the available options and select the social media service that best fits your needs.",
    },
    {
      title: "Place Order",
      text: "Complete your purchase by providing the necessary details, then monitor progress from your dashboard.",
    },
  ];
  return (
    <section id="steps" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          before="Start your social media empire with "
          highlight="Intopsmm"
          sub="You need just 3 steps and you will see the magic. So why are you waiting?"
        />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card
              key={s.title}
              className="relative overflow-hidden border-border/60 bg-[image:var(--gradient-primary)] p-7 text-primary-foreground shadow-glow"
            >
              <h3 className="text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm opacity-90">{s.text}</p>
              <span className="mt-6 inline-flex items-baseline gap-1 text-4xl font-extrabold opacity-80">
                0{i + 1} <small className="text-xs font-semibold uppercase">Step</small>
              </span>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
function Testimonials() {
  const rowA = [
    {
      text: "Intopsmm has truly changed the game for me! Their services are reliable and super affordable. My Instagram has seen real growth in just a few weeks.",
      name: "Deepak Sharma",
      role: "Social Media Manager at TechMinds, Mumbai",
    },
    {
      text: "The ease of use and effectiveness of Intopsmm is amazing. My YouTube channel has grown significantly since I started using their services.",
      name: "Rohit Mehta",
      role: "Small Business Owner",
    },
    {
      text: "This SMM panel is a game-changer! It's easy to use and the results are fantastic. The quality of their services is unmatched.",
      name: "Emily Davis",
      role: "Digital Marketer",
    },
    {
      text: "I am very satisfied with the quality and speed of the services provided. The support team is always there to help, which is a huge plus.",
      name: "Sarah Johnson",
      role: "Marketing Director at Bright Ideas Co., New York",
    },
  ];
  const rowB = [
    {
      text: "Professional and efficient. The panel helped my posts get the visibility they needed. Definitely worth the investment!",
      name: "Fatima A.",
      role: "E-commerce Entrepreneur",
    },
    {
      text: "I was struggling to get engagement on my Facebook page, but Intopsmm turned that around. Their 24/7 support is fantastic.",
      name: "Priya R.",
      role: "Influencer",
    },
    {
      text: "The best SMM panel I've ever used. It's affordable and delivers real results. My accounts have never looked better!",
      name: "Nina K.",
      role: "Social Media Manager",
    },
    {
      text: "I love how easy it is to use Intopsmm. The platform is straightforward and my Twitter engagement has skyrocketed.",
      name: "David Lee",
      role: "Social Media Strategist at TrendSetters, Los Angeles",
    },
  ];
  const Row = ({ items }: { items: typeof rowA }) => (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {items.map((t) => (
        <Card key={t.name} className="glass flex flex-col border-border/60 p-6 shadow-card">
          <div className="flex gap-0.5 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <p className="mt-3 flex-1 text-sm text-muted-foreground">{t.text}</p>
          <div className="mt-5 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[image:var(--gradient-primary)] text-sm font-bold text-primary-foreground">
              {t.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold">{t.name}</h3>
              <span className="block truncate text-xs text-muted-foreground">{t.role}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
  return (
    <section className="bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          before="What clients say about "
          highlight="Intopsmm"
          after="!"
          sub="These are some things our clients have to say about our work."
        />
        <div className="mt-10 space-y-6">
          <Row items={rowA} />
          <Row items={rowB} />
        </div>
      </div>
    </section>
  );
}

/* ---------------- FEATURE SPLITS ---------------- */
function FeatureSplits() {
  const blocks = [
    {
      sub: "Upgrade your social media presence with Intopsmm's top-rated services!",
      before: "Skyrocket ",
      highlight: "Your Followers",
      after: " Count Instantly 🚀",
      text: "Our SMM panel is your ultimate solution for quickly boosting followers on all major platforms. With trusted and secure services you can easily grow your online presence and connect with a bigger audience.",
      cta: "Get Ready Now",
      img: featureFollowers,
      alt: "Creators celebrating growing follower counts on a smartphone",
      flip: false,
    },
    {
      sub: "Real engagement with premium likes and comments! 🌟",
      before: "Engage Your Audience ",
      highlight: "and Spark Their Interest!",
      after: "",
      text: "Connect with your audience like never before using premium likes and comments. Our platform delivers real interactions from genuine users, boosting your profile's credibility and appeal.",
      cta: "Supercharge Your Engagement 🚀",
      img: featureEngagement,
      alt: "Creator engaging with likes and comments on her phone",
      flip: true,
    },
    {
      sub: "Affordable SMM services that make an impact!",
      before: "",
      highlight: "Cheapest SMM Services",
      after: " for Maximum Profit! 🚀",
      text: "Discover cost-effective packages designed to meet all your social media needs — from followers and likes to views and shares. Enjoy top-notch quality without burning a hole in your wallet.",
      cta: "View Pricing",
      img: featurePricing,
      alt: "Person making an affordable online payment next to an analytics dashboard",
      flip: false,
    },
  ];
  return (
    <>
      {blocks.map((b, i) => (
        <section
          key={b.sub}
          className={`px-4 py-16 sm:px-6 lg:px-8 ${i === 1 ? "bg-secondary/40" : ""}`}
        >
          <div className="mx-auto grid max-w-7xl items-center gap-10 md:grid-cols-2">
            <div className={b.flip ? "md:order-2" : ""}>
              <span className="inline-flex rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                {b.sub}
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {b.before}
                <span className="gradient-text">{b.highlight}</span>
                {b.after}
              </h2>
              <p className="mt-4 text-muted-foreground">{b.text}</p>
              <Button asChild variant="hero" size="lg" className="mt-6">
                <Link to="/register">{b.cta}</Link>
              </Button>
            </div>
            <div
              className={`overflow-hidden rounded-3xl border border-border/60 shadow-glow ${
                b.flip ? "md:order-1" : ""
              }`}
            >
              <img
                src={b.img}
                alt={b.alt}
                loading="lazy"
                width={1200}
                height={800}
                className="h-64 w-full object-cover"
              />
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

/* ---------------- FAQ ---------------- */
const faqTabs = {
  General: [
    {
      q: "What is an SMM panel?",
      a: "An SMM panel is a web-based platform that provides social media marketing services, such as increasing followers, likes, views and other engagement metrics across various platforms.",
    },
    {
      q: "How does an SMM panel work?",
      a: "You provide the username or link of your social media profile, select a service, place an order, and the panel processes it to boost your social media metrics.",
    },
    {
      q: "Is using an SMM panel safe?",
      a: "Yes, using a reputable SMM panel is generally safe. Choose a panel with positive reviews and reliable customer support to avoid any issues.",
    },
    {
      q: "Which social media platforms do you support?",
      a: "We support a wide range of platforms including Instagram, Facebook, Twitter, YouTube, TikTok and more. Check the services section for the full list.",
    },
  ],
  Pricing: [
    {
      q: "How much does it cost to use an SMM panel?",
      a: "The cost varies depending on the services you choose and the quantity needed. We offer competitive pricing in INR with packages to fit different budgets.",
    },
    {
      q: "Are there any hidden fees?",
      a: "No. We are fully transparent about pricing — review the pricing details and terms of service before ordering.",
    },
    {
      q: "Do you offer discounts for bulk orders?",
      a: "Yes, we offer discounts for bulk orders. Check the pricing section or contact customer support for more information.",
    },
    {
      q: "How do I pay for the services?",
      a: "We accept UPI, credit/debit cards, net banking and cryptocurrencies. All prices and wallet balances are in Indian Rupees (₹).",
    },
  ],
  Dashboard: [
    {
      q: "How do I navigate the dashboard?",
      a: "The dashboard is designed to be user-friendly. After logging in you can access order history, available services and account settings, with a guide for new users.",
    },
    {
      q: "Can I track my orders on the dashboard?",
      a: "Yes, you can track the progress of your orders in real time through the dashboard, including the status and details of each order.",
    },
    {
      q: "What if I encounter issues on the dashboard?",
      a: "Our customer support team is ready to assist you. Contact them via ticket, email or live chat for help.",
    },
    {
      q: "How do I update my account information?",
      a: "You can update your email, password and payment details directly from the dashboard under account settings. Make sure to save any changes.",
    },
  ],
  API: [
    {
      q: "Does your SMM panel offer an API?",
      a: "Yes, we offer a full API for developers to integrate our services directly into their applications or websites.",
    },
    {
      q: "How do I get access to the API?",
      a: "Register for an account and request API access through the dashboard. Some accounts may require additional verification.",
    },
    {
      q: "What documentation is available for the API?",
      a: "Comprehensive API documentation is available on our website, including endpoints, authentication and sample code.",
    },
    {
      q: "Are there any usage limits on the API?",
      a: "Check the API documentation or contact support to understand any limitations or rate limits associated with the API.",
    },
  ],
} as const;

type FaqTab = keyof typeof faqTabs;

function FAQSection() {
  const [tab, setTab] = useState<FaqTab>("General");
  return (
    <section id="faq" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          before="Frequently Asked Questions "
          highlight="(FAQ)"
          sub="These are the most commonly asked questions about Intopsmm."
        />
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {(Object.keys(faqTabs) as FaqTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === t
                  ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                  : "border border-border/60 bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {faqTabs[tab].map((f) => (
            <Card key={f.q} className="glass border-border/60 p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow">
                  <HelpCircle className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {tab}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold">{f.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CTASection() {
  const pay = ["UPI", "Visa", "Mastercard", "RuPay", "USDT"];
  return (
    <section id="contact" className="px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Card className="border-border/60 bg-[image:var(--gradient-primary)] p-10 text-center text-primary-foreground shadow-glow sm:p-14">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Register Now and Get High Bonus!</h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm opacity-90">
            Enhance your social media presence with Intopsmm services. Sign up now to access a wide
            range of tools designed to boost your online visibility and engagement. Join us and
            watch your social media accounts thrive!
          </p>
          <Button asChild size="lg" variant="complementary" className="mt-8 font-bold">
            <Link to="/register">
              Register Now <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {pay.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold backdrop-blur"
              >
                <CreditCard className="h-3.5 w-3.5" /> {p}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  const cols = [
    { title: "Company", links: ["About", "Careers", "Press", "Blog"] },
    { title: "Policies", links: ["Terms", "Privacy", "Refunds", "AUP"] },
    { title: "Developers", links: ["API Docs", "Status", "Integrations", "Webhooks"] },
    { title: "Support", links: ["Help Center", "Contact", "Community", "System status"] },
  ];
  return (
    <footer className="border-t border-border/60 bg-secondary/40 px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center">
              <Logo />
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              The fastest, most secure and fully automated SMM panel for creators, agencies and
              resellers.
            </p>
            <div className="mt-4 flex gap-2">
              {[
                { I: Instagram, label: "Instagram" },
                { I: Twitter, label: "Twitter" },
                { I: Facebook, label: "Facebook" },
                { I: Youtube, label: "YouTube" },
              ].map(({ I, label }) => (
                <a
                  key={label}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow transition hover:opacity-90"
                  aria-label={label}
                >
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-sm font-semibold">{c.title}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Intopsmm. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with Intopsmm in mind — hello@intopsmm.io
          </p>
        </div>
      </div>
    </footer>
  );
}
