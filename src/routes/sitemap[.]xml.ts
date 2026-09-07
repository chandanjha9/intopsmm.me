import { createFileRoute } from "@tanstack/react-router";
import { poolConnect } from "@/integrations/sqlServer/client";
import { SITE_CONFIG } from "@/lib/seo/site-config";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const baseUrl = SITE_CONFIG.siteUrl;
        const now = new Date().toISOString().split("T")[0];

        // 1. Core public static pages
        const staticEntries: SitemapEntry[] = [
          { loc: `${baseUrl}/`, lastmod: now, changefreq: "daily", priority: "1.0" },
          { loc: `${baseUrl}/services`, lastmod: now, changefreq: "daily", priority: "0.9" },
          { loc: `${baseUrl}/blog`, lastmod: now, changefreq: "daily", priority: "0.8" },
          { loc: `${baseUrl}/faq`, lastmod: now, changefreq: "weekly", priority: "0.7" },
          { loc: `${baseUrl}/about`, lastmod: now, changefreq: "monthly", priority: "0.7" },
          { loc: `${baseUrl}/contact`, lastmod: now, changefreq: "monthly", priority: "0.7" },
          { loc: `${baseUrl}/terms`, lastmod: now, changefreq: "monthly", priority: "0.5" },
        ];

        // 2. High-intent Platform & Service Category Pages
        const servicePages = [
          "instagram",
          "instagram-followers",
          "instagram-likes",
          "youtube",
          "youtube-views",
          "telegram",
          "facebook",
          "tiktok",
          "tiktok-followers",
          "twitter",
          "spotify",
        ];
        const platformEntries: SitemapEntry[] = servicePages.map((p) => ({
          loc: `${baseUrl}/services/${p}`,
          lastmod: now,
          changefreq: "daily",
          priority: "0.8",
        }));

        // 3. Dynamic Blog Articles from database
        let blogEntries: SitemapEntry[] = [];
        try {
          const db = await poolConnect;
          const postsRes = await db.request().query(`
            SELECT slug, updated_at, published_at
            FROM blog_posts
            WHERE is_published = 1
            ORDER BY published_at DESC
          `);

          blogEntries = postsRes.recordset.map((post) => {
            const dateStr = post.updated_at || post.published_at;
            const lastmod = dateStr ? new Date(dateStr).toISOString().split("T")[0] : now;
            return {
              loc: `${baseUrl}/blog/${post.slug}`,
              lastmod,
              changefreq: "weekly",
              priority: "0.7",
            };
          });
        } catch (e) {
          console.error("Sitemap dynamic blog fetch error:", e);
        }

        const allEntries = [...staticEntries, ...platformEntries, ...blogEntries];

        const urlsXml = allEntries
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${e.loc}</loc>`,
              e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          urlsXml,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=1800, s-maxage=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
