import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  Share2,
  Sparkles,
  Tag,
  User,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBlogPostBySlug } from "@/lib/blog/blog.functions";
import { Nav, Footer } from "@/routes/index";
import { SITE_CONFIG } from "@/lib/seo/site-config";
import { getArticleSchema, getBreadcrumbSchema } from "@/lib/seo/schema";

export const Route = createFileRoute("/blog/$slug")({
  head: ({ params }) => {
    // In TanStack Start head hook, we can set canonical and metadata
    const slug = (params as { slug: string }).slug;
    const canonical = `${SITE_CONFIG.siteUrl}/blog/${slug}`;
    const defaultTitle = `${slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())} | Intopsmm`;

    return {
      meta: [
        { title: defaultTitle },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
        { property: "og:type", content: "article" },
        { property: "og:url", content: canonical },
        { property: "og:site_name", content: SITE_CONFIG.brand },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: BlogArticlePage,
});

function BlogArticlePage() {
  const { slug } = Route.useParams() as { slug: string };
  const fetchPost = useServerFn(getBlogPostBySlug);

  const { data, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => fetchPost({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

  const post = data?.post;
  const related = data?.related ?? [];

  if (!isLoading && !post) {
    throw notFound();
  }

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post?.title ?? "Article", path: `/blog/${slug}` },
  ];

  const jsonLdSchemas = post
    ? [
        getBreadcrumbSchema(breadcrumbs),
        getArticleSchema({
          title: post.seo_title || post.title,
          description: post.seo_description || post.excerpt,
          path: `/blog/${post.slug}`,
          coverImage: post.cover_image ?? undefined,
          author: post.author,
          datePublished: post.published_at,
        }),
      ]
    : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />

      {/* JSON-LD Structured Data Injection */}
      {post && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": jsonLdSchemas,
            }),
          }}
        />
      )}

      {/* Article Header */}
      <article className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="font-semibold text-foreground truncate max-w-xs">{post?.title ?? "Loading…"}</span>
        </nav>

        {isLoading && (
          <div className="space-y-4 animate-pulse py-10">
            <div className="h-6 w-32 rounded bg-muted/60" />
            <div className="h-10 w-3/4 rounded bg-muted/60" />
            <div className="h-64 rounded-2xl bg-muted/40 mt-8" />
          </div>
        )}

        {post && (
          <>
            <header className="border-b border-border/50 pb-8">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {post.read_time}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(post.published_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* Single Primary H1 */}
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl leading-tight">
                {post.title}
              </h1>

              <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
                {post.excerpt}
              </p>

              {/* Author badge */}
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{post.author}</p>
                  <p className="text-[11px] text-muted-foreground">Verified Growth Strategist · Intopsmm</p>
                </div>
              </div>
            </header>

            {/* Article Body Content */}
            <div className="mt-8 space-y-6 text-sm sm:text-base leading-relaxed text-foreground/90 font-normal [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-foreground [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:my-4 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-4 [&_ul]:space-y-2 [&_li]:leading-relaxed [&_a]:text-primary [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-foreground [&_strong]:font-semibold">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {/* Contextual SMM Service Callout */}
            <div className="my-10 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 to-card p-6 shadow-card">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-primary/20 p-2.5 text-primary">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-foreground">Accelerate Your Results Instantly</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Don't wait months for organic momentum. Deploy high-retention social signals at wholesale INR prices directly through Intopsmm.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild size="sm" className="rounded-lg text-xs font-semibold">
                      <Link to="/services">View Live SMM Services</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="rounded-lg text-xs font-semibold">
                      <Link to="/register">Create Free Account</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tags footer */}
            {post.tags && (
              <div className="mt-8 pt-6 border-t border-border/50 flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Topics:
                </span>
                {post.tags.split(",").map((tag) => (
                  <span
                    key={tag.trim()}
                    className="rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    #{tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Related Guides (Internal Linking) */}
        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-border/60">
            <h2 className="text-xl font-bold tracking-tight">Recommended Growth Guides</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {related.map((rel) => (
                <Card
                  key={rel.id}
                  className="flex flex-col justify-between border-border/60 p-4 transition hover:border-primary/50"
                >
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {rel.category}
                    </span>
                    <h3 className="mt-2 text-sm font-bold tracking-tight line-clamp-2">
                      <Link to={`/blog/${rel.slug}` as any} className="hover:text-primary">
                        {rel.title}
                      </Link>
                    </h3>
                  </div>
                  <Link
                    to={`/blog/${rel.slug}` as any}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Read <ArrowRight className="h-3 w-3" />
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}
      </article>

      <Footer />
    </div>
  );
}
