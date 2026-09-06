import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { poolConnect } from "@/integrations/sqlServer/client";
import sql from "mssql";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string | null;
  author: string;
  read_time: string;
  cover_image: string | null;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string;
}

export const listBlogPosts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        category: z.string().optional(),
        search: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    try {
      const db = await poolConnect;
      const request = db.request();
      request.input("limit", sql.Int, data.limit || 20);

      let whereClause = "WHERE is_published = 1";
      if (data.category && data.category !== "All") {
        request.input("category", sql.NVarChar, data.category);
        whereClause += " AND category = @category";
      }
      if (data.search) {
        request.input("search", sql.NVarChar, `%${data.search.trim()}%`);
        whereClause += " AND (title LIKE @search OR excerpt LIKE @search OR tags LIKE @search)";
      }

      const result = await request.query(`
        SELECT TOP (@limit)
          id,
          slug,
          title,
          excerpt,
          content,
          category,
          tags,
          author,
          read_time,
          cover_image,
          seo_title,
          seo_description,
          published_at
        FROM blog_posts
        ${whereClause}
        ORDER BY published_at DESC
      `);

      return {
        posts: result.recordset.map((row) => ({
          id: String(row.id),
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          content: row.content,
          category: row.category,
          tags: row.tags,
          author: row.author,
          read_time: row.read_time,
          cover_image: row.cover_image,
          seo_title: row.seo_title,
          seo_description: row.seo_description,
          published_at: new Date(row.published_at).toISOString(),
        })) as BlogPost[],
        error: null,
      };
    } catch (err) {
      console.error("listBlogPosts error:", err);
      return { posts: [], error: "Failed to load blog posts" };
    }
  });

export const getBlogPostBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const db = await poolConnect;
      const request = db.request();
      request.input("slug", sql.NVarChar, data.slug);

      const result = await request.query(`
        SELECT TOP 1
          id,
          slug,
          title,
          excerpt,
          content,
          category,
          tags,
          author,
          read_time,
          cover_image,
          seo_title,
          seo_description,
          published_at
        FROM blog_posts
        WHERE slug = @slug AND is_published = 1
      `);

      if (!result.recordset[0]) {
        return { post: null, error: "Article not found" };
      }

      const row = result.recordset[0];
      const post: BlogPost = {
        id: String(row.id),
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        content: row.content,
        category: row.category,
        tags: row.tags,
        author: row.author,
        read_time: row.read_time,
        cover_image: row.cover_image,
        seo_title: row.seo_title,
        seo_description: row.seo_description,
        published_at: new Date(row.published_at).toISOString(),
      };

      // Also get 3 related posts
      const relatedReq = db.request();
      relatedReq.input("currentSlug", sql.NVarChar, data.slug);
      relatedReq.input("category", sql.NVarChar, post.category);
      const relatedRes = await relatedReq.query(`
        SELECT TOP 3 id, slug, title, excerpt, category, read_time, published_at
        FROM blog_posts
        WHERE slug != @currentSlug AND is_published = 1
        ORDER BY CASE WHEN category = @category THEN 0 ELSE 1 END, published_at DESC
      `);

      const related = relatedRes.recordset.map((r) => ({
        id: String(r.id),
        slug: r.slug,
        title: r.title,
        excerpt: r.excerpt,
        category: r.category,
        read_time: r.read_time,
        published_at: new Date(r.published_at).toISOString(),
      }));

      return { post, related, error: null };
    } catch (err) {
      console.error("getBlogPostBySlug error:", err);
      return { post: null, related: [], error: "Failed to load article" };
    }
  });
