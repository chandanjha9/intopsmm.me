import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Logo } from "@/components/ui/Logo";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useLanguage } from "@/hooks/use-language";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Gift,
  Percent,
  Tag,
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

  // While the session is being verified (or when already logged in), never flash
  // the landing page — show a lightweight splash until the redirect happens.
  if (loading || session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page-tint">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-page-tint text-foreground">
      <Nav />
      <PromoPopup />
      <PromoSticker />
      <Hero />
      <TagStrip />
      <WhyChoose />
      <InsightCards />
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

/* ---------------- PROMO POPUP & STICKER ---------------- */
function PromoPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md border-0 bg-[image:var(--gradient-primary)] p-0 text-primary-foreground sm:rounded-2xl">
        <div className="relative overflow-hidden p-6 pt-8 text-center sm:p-8">
          <span className="absolute -right-6 -top-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
            <Gift className="h-10 w-10 text-white" />
          </span>
          <DialogHeader>
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-primary shadow-lg">
              <Percent className="h-7 w-7" />
            </div>
            <DialogTitle className="mt-5 text-2xl font-bold text-white">
              30% OFF First Order!
            </DialogTitle>
            <DialogDescription className="text-white/85">
              Welcome to Intopsmm. Place your first order today and get a flat 30% discount.
              Limited time offer — don't miss out!
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild variant="complementary" size="lg" className="font-bold">
              <Link to="/register" onClick={() => setOpen(false)}>
                Claim Offer <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setOpen(false)}
              className="text-white hover:bg-white/15 hover:text-white"
            >
              Maybe later
            </Button>
          </div>
          <p className="mt-4 text-xs text-white/70">*Auto-applied at checkout for new users.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PromoSticker() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-2 md:flex">
      <div className="relative overflow-hidden rounded-l-2xl bg-[image:var(--gradient-primary)] p-3 pl-4 pr-5 text-primary-foreground shadow-glow">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-1 top-1 rounded p-0.5 text-white/70 transition hover:bg-white/20 hover:text-white"
          aria-label="Close offer"
        >
          <X className="h-3 w-3" />
        </button>
        <div className="flex items-center gap-2 pr-4">
          <Tag className="h-5 w-5" />
          <div>
            <p className="text-xs font-bold leading-tight">30% OFF</p>
            <p className="text-[10px] leading-tight text-white/85">First Order</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- NAV ---------------- */
export function Nav() {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const links = [
    { to: "/services", label: "Our Services" },
    { href: "#steps", label: t("howItWorks") },
    { to: "/terms", label: t("terms") },
  ];
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="#home" className="flex items-center">
            <Logo />
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((l) =>
              l.to ? (
                <Link
                  key={l.to}
                  to={l.to}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </a>
              )
            )}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
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
              {links.map((l) =>
                l.to ? (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    {l.label}
                  </a>
                )
              )}
              <div className="mt-2">
                <LanguageSwitcher className="w-full justify-start" />
              </div>
              <div className="mt-2 flex gap-2">
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
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

function HeroLoginCard() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate({ to: "/dashboard" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("popup-closed") && !msg.includes("cancelled")) {
        toast.error(msg || "Google sign-in failed");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-[440px] rounded-2xl border-border/60 bg-card p-7 shadow-card">
      <h2 className="text-xl font-bold tracking-tight">Welcome Back 👋</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        No account?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Sign up free
        </Link>
      </p>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <Label htmlFor="hero-email" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Username
          </Label>
          <Input
            id="hero-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 text-sm"
            required
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="hero-password" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <Link to="/forgot-password" className="text-[11px] font-medium text-primary hover:underline">
              Password Lost?
            </Link>
          </div>
          <Input
            id="hero-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 text-sm"
            required
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox id="hero-remember" defaultChecked className="h-4 w-4" /> Remember me
        </label>
        <Button type="submit" variant="hero" className="h-11 w-full text-sm font-semibold" disabled={submitting || googleLoading}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <div className="relative my-5 flex items-center gap-2">
        <div className="flex-1 border-t border-border" />
        <span className="text-[11px] text-muted-foreground">or continue with</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full gap-2 text-sm font-medium"
        onClick={handleGoogle}
        disabled={googleLoading || submitting}
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark className="h-4 w-4" />}
        Continue with Google
      </Button>
    </Card>
  );
}

function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-[image:var(--gradient-primary)] px-4 pb-16 pt-16 text-white sm:px-6 lg:px-8">

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-0 top-20 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl" />
      </div>
      <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-foreground shadow-glow">
            <Globe2 className="h-3.5 w-3.5 text-primary" /> India Best SMM Panel
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl xl:text-6xl">
            Intopsmm — The Fastest <span className="text-white">SMM Panel</span> for Social Media
            Growth
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/75 lg:mx-0">
            Boost your social media game and dominate the digital world with{" "}
            <b className="text-white">Intopsmm</b> — your trusted partner for unbeatable
            growth strategies and professional support.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <Button asChild size="lg" className="bg-white text-foreground hover:bg-white/90">
              <Link to="/register">
                <Sparkles className="mr-2 h-4 w-4" /> Create Account!
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <HeroLoginCard />
        </div>
      </div>
    </section>
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



/* ---------------- NUMBERS ---------------- */
function NumbersCard() {
  const stats = [
    { Icon: Wallet, title: "Prices Starting From", value: "₹16 / 1k" },
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
function PhoneMockup({ index }: { index: number }) {
  const screens = [
    {
      app: "Instagram",
      icon: "IG",
      top: "+1,250 new followers",
      mid: "this week",
      bottom: "12.4K total followers",
      stat: "+11.2%",
      color: "from-pink-500 to-rose-500",
    },
    {
      app: "Instagram",
      icon: "IG",
      top: "+5,420 new likes",
      mid: "this week",
      bottom: "89.7K total engagements",
      stat: "+24.8%",
      color: "from-purple-500 to-indigo-500",
    },
    {
      app: "Wallet",
      icon: "₹",
      top: "Wallet Balance",
      mid: "₹2,450.00",
      bottom: "Orders placed today: 142",
      stat: "-32% cost",
      color: "from-emerald-500 to-teal-500",
    },
  ];
  const s = screens[index % screens.length];
  return (
    <div className="relative mx-auto w-64 sm:w-72">
      {/* Phone frame */}
      <div className="relative rounded-[2.25rem] border-[6px] border-white/80 bg-white p-3 shadow-2xl shadow-black/20 backdrop-blur-sm">
        {/* Notch */}
        <div className="absolute left-1/2 top-3 h-5 w-20 -translate-x-1/2 rounded-full bg-neutral-200" />
        {/* Screen */}
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-neutral-900 to-neutral-800 pt-8">
          {/* App header */}
          <div className="flex items-center gap-3 px-5 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-sm font-bold text-white shadow-lg`}>
              {s.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{s.app}</p>
              <p className="text-xs text-white/50">Just now</p>
            </div>
          </div>
          {/* Notification card */}
          <div className="mx-4 mb-6 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-white">{s.top}</p>
                <p className="text-sm text-white/70">{s.mid}</p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">
                {s.stat}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" />
            </div>
            <p className="mt-3 text-xs text-white/60">{s.bottom}</p>
          </div>
          {/* Decorative chart bars */}
          <div className="flex items-end justify-between gap-2 px-5 pb-6">
            {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
              <div
                key={i}
                className="w-full rounded-t-md bg-gradient-to-t from-primary/60 to-primary opacity-80"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        </div>
      </div>
      {/* Glow behind */}
      <div className={`absolute -inset-4 -z-10 rounded-[3rem] bg-gradient-to-br ${s.color} opacity-20 blur-2xl`} />
    </div>
  );
}

function FeatureSplits() {
  const blocks = [
    {
      sub: "Upgrade your social media presence with Intopsmm's top-rated services!",
      before: "Skyrocket ",
      highlight: "Your Followers",
      after: " Count Instantly 🚀",
      text: "Our SMM panel is your ultimate solution for quickly boosting followers on all major platforms. With trusted and secure services you can easily grow your online presence and connect with a bigger audience.",
      cta: "Get Ready Now",
      flip: false,
    },
    {
      sub: "Real engagement with premium likes and comments! 🌟",
      before: "Engage Your Audience ",
      highlight: "and Spark Their Interest!",
      after: "",
      text: "Connect with your audience like never before using premium likes and comments. Our platform delivers real interactions from genuine users, boosting your profile's credibility and appeal.",
      cta: "Supercharge Your Engagement 🚀",
      flip: true,
    },
    {
      sub: "Affordable SMM services that make an impact!",
      before: "",
      highlight: "Cheapest SMM Services",
      after: " for Maximum Profit! 🚀",
      text: "Discover cost-effective packages designed to meet all your social media needs — from followers and likes to views and shares. Enjoy top-notch quality without burning a hole in your wallet.",
      cta: "View Pricing",
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
            <div className={`flex justify-center ${b.flip ? "md:order-1" : ""}`}>
              <PhoneMockup index={i} />
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
            Enhance your social media presence with Intopsmm services. Sign up now to access a
            wide range of tools designed to boost your online visibility and engagement. Join us and
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
export function Footer() {
  return (
    <footer className="border-t border-white/20 bg-[image:var(--gradient-primary)] px-4 py-12 text-primary-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center">
              <Logo />
            </div>
            <p className="mt-3 max-w-sm text-sm text-white/80">
              The fastest, most secure and fully automated SMM panel for creators, agencies and
              resellers.
            </p>
          </div>
          <div className="flex gap-3">
            {[
              { I: Instagram, label: "Instagram", href: "https://instagram.com/intopsmm.me" },
              { I: Twitter, label: "Twitter", href: "#" },
              { I: Facebook, label: "Facebook", href: "#" },
              { I: Youtube, label: "YouTube", href: "#" },
            ].map(({ I, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-primary-foreground shadow-glow transition hover:bg-white/25"
                aria-label={label}
              >
                <I className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/20 pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-white/70">
            © {new Date().getFullYear()} Intopsmm. All rights reserved.
          </p>
          <p className="text-xs text-white/70">
            Made with Intopsmm in mind —{" "}
            <a href="mailto:intopsmm.me@gmail.com" className="hover:text-white hover:underline">
              intopsmm.me@gmail.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
