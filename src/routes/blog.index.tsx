import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, BookOpen, Calendar, Clock, Search, Sparkles, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listBlogPosts } from "@/lib/blog/blog.functions";
import { Nav, Footer } from "@/routes/index";
import { SITE_CONFIG } from "@/lib/seo/site-config";
import { getBreadcrumbSchema } from "@/lib/seo/schema";

export const Route = createFileRoute("/blog/")({
  loader: async () => {
    return await listBlogPosts({ data: {} });
  },
  head: () => ({
    meta: [
      { title: "SMM Growth Blog & Social Media Guides — Intopsmm" },
      {
        name: "description",
        content:
          "Read expert social media marketing guides. Master Instagram growth, YouTube 4000 watch hours, Telegram community scaling, and SMM panel automation strategies.",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:title", content: "SMM Growth Blog & Social Media Guides — Intopsmm" },
      {
        property: "og:description",
        content: "Actionable SMM guides for creators, agencies, and resellers to dominate social media algorithms.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_CONFIG.siteUrl}/blog` },
      { property: "og:image", content: `${SITE_CONFIG.siteUrl}/favicon.png` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SMM Growth Blog — Intopsmm" },
      { name: "twitter:description", content: "Master social growth with actionable guides and SMM tactics." },
      { name: "twitter:image", content: `${SITE_CONFIG.siteUrl}/favicon.png` },
    ],
    links: [{ rel: "canonical", href: `${SITE_CONFIG.siteUrl}/blog` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          getBreadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ),
      },
    ],
  }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const initialData = Route.useLoaderData();
  const fetchPosts = useServerFn(listBlogPosts);
  const { data, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => fetchPosts({ data: {} }),
    initialData,
    staleTime: 5 * 60 * 1000,
  });

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  const posts = data?.posts ?? [];

  const categories = useMemo(() => {
    const cats = new Set<string>(["All"]);
    posts.forEach((p) => cats.add(p.category));
    return Array.from(cats);
  }, [posts]);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchQuery =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        (p.tags ?? "").toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [posts, selectedCategory, search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* Hero Header */}
      <section className="border-b border-border/40 bg-gradient-to-b from-primary/10 via-background to-background px-4 pb-14 pt-10 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            <BookOpen className="h-3.5 w-3.5" /> Growth & Marketing Resources
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Intopsmm Growth Blog — Social Media Marketing Guides
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Actionable, non-drop algorithmic strategies to help creators, brands, and agencies conquer Instagram,
            YouTube, Telegram, and TikTok.
          </p>

          {/* Search bar */}
          <div className="mx-auto mt-8 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search strategies, algorithms, platforms…"
                className="h-11 rounded-xl pl-10 text-sm shadow-sm"
              />
            </div>
          </div>

          {/* Category Chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                  selectedCategory === cat
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

      {/* Main Articles Grid */}
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-72 animate-pulse rounded-2xl bg-muted/40 border border-border/40" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/40 p-12 text-center text-sm text-muted-foreground">
            No articles match your search criteria. Try selecting another category or clearing search.
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <Card
              key={post.id}
              className="flex flex-col justify-between overflow-hidden border-border/60 bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                    <Tag className="h-3 w-3" /> {post.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {post.read_time}
                  </span>
                </div>

                <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground transition line-clamp-2 hover:text-primary">
                  <Link to={`/blog/${post.slug}` as any}>
                    {post.title}
                  </Link>
                </h2>

                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {post.excerpt}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>

                <Link
                  to={`/blog/${post.slug}` as any}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition hover:gap-1.5"
                >
                  Read Guide <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick SMM Services CTA banner */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card to-card p-8 shadow-card sm:p-10">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Ready to Scale?
              </span>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Turn Knowledge Into Explosive Growth
              </h2>
              <p className="mt-2 max-w-xl text-xs text-muted-foreground sm:text-sm">
                Join over 10,000+ creators and agencies who trust Intopsmm for automated non-drop SMM services.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-xl font-semibold shadow-md">
                <Link to="/register">Create Free Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl font-semibold">
                <Link to="/services">Explore Services</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
