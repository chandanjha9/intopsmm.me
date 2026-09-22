import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { requireAuth } from "@/lib/auth/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard.server";

export type Announcement = {
  id: string;
  title: string;
  description: string;
  category: string;
  post_type: "news" | "alert" | "price_drop" | "improvement";
  badge: string | null;
  is_popup: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().trim().min(5, "Description must be at least 5 characters"),
  category: z.string().trim().default("General"),
  post_type: z.enum(["news", "alert", "price_drop", "improvement"]).default("news"),
  badge: z.string().trim().optional(),
  is_popup: z.boolean().default(false),
  is_active: z.boolean().default(true),
  expires_at: z.string().datetime().nullable().optional(),
});

const updateAnnouncementSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(5),
  category: z.string().trim().default("General"),
  post_type: z.enum(["news", "alert", "price_drop", "improvement"]).default("news"),
  badge: z.string().trim().optional(),
  is_popup: z.boolean().default(false),
  is_active: z.boolean().default(true),
  expires_at: z.string().datetime().nullable().optional(),
});

const toggleActiveSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
});

const deleteAnnouncementSchema = z.object({
  id: z.string().uuid(),
});

/** List all announcements for Admin (both active and inactive) */
export const listAnnouncementsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    const db = await poolConnect;
    const result = await db.request().query(`
      SELECT 
        id,
        title,
        description,
        category,
        post_type,
        badge,
        is_popup,
        is_active,
        created_at,
        updated_at,
        expires_at
      FROM announcements
      ORDER BY created_at DESC
    `);

    return result.recordset.map((row) => ({
      ...row,
      id: String(row.id),
      is_popup: Boolean(row.is_popup),
      is_active: Boolean(row.is_active),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    })) as Announcement[];
  });

// In-memory cache for ultra-fast instant load of announcements and alerts
let activeAnnouncementsCache: { data: Announcement[]; expiresAt: number } | null = null;
let popupAlertsCache: { data: Announcement[]; expiresAt: number } | null = null;

export function invalidateAnnouncementsCache() {
  activeAnnouncementsCache = null;
  popupAlertsCache = null;
}

/** Create a new Announcement or Alert */
export const createAnnouncementAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => createAnnouncementSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await poolConnect;

    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

    const result = await db
      .request()
      .input("title", sql.NVarChar(255), data.title)
      .input("description", sql.NVarChar(sql.MAX), data.description)
      .input("category", sql.NVarChar(100), data.category || "General")
      .input("post_type", sql.NVarChar(50), data.post_type)
      .input("badge", sql.NVarChar(100), data.badge || null)
      .input("is_popup", sql.Bit, data.is_popup ? 1 : 0)
      .input("is_active", sql.Bit, data.is_active ? 1 : 0)
      .input("expires_at", sql.DateTimeOffset, expiresAt)
      .query(`
        INSERT INTO announcements (title, description, category, post_type, badge, is_popup, is_active, expires_at)
        OUTPUT INSERTED.id
        VALUES (@title, @description, @category, @post_type, @badge, @is_popup, @is_active, @expires_at)
      `);

    invalidateAnnouncementsCache();
    return { success: true, id: String(result.recordset[0].id) };
  });

/** Update existing Announcement */
export const updateAnnouncementAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => updateAnnouncementSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await poolConnect;

    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

    await db
      .request()
      .input("id", sql.UniqueIdentifier, data.id)
      .input("title", sql.NVarChar(255), data.title)
      .input("description", sql.NVarChar(sql.MAX), data.description)
      .input("category", sql.NVarChar(100), data.category)
      .input("post_type", sql.NVarChar(50), data.post_type)
      .input("badge", sql.NVarChar(100), data.badge || null)
      .input("is_popup", sql.Bit, data.is_popup ? 1 : 0)
      .input("is_active", sql.Bit, data.is_active ? 1 : 0)
      .input("expires_at", sql.DateTimeOffset, expiresAt)
      .query(`
        UPDATE announcements
        SET 
          title = @title,
          description = @description,
          category = @category,
          post_type = @post_type,
          badge = @badge,
          is_popup = @is_popup,
          is_active = @is_active,
          expires_at = @expires_at,
          updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id
      `);

    invalidateAnnouncementsCache();
    return { success: true };
  });

/** Toggle Active state */
export const toggleAnnouncementActiveAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => toggleActiveSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await poolConnect;

    await db
      .request()
      .input("id", sql.UniqueIdentifier, data.id)
      .input("is_active", sql.Bit, data.isActive ? 1 : 0)
      .query(`
        UPDATE announcements
        SET is_active = @is_active, updated_at = SYSDATETIMEOFFSET()
        WHERE id = @id
      `);

    invalidateAnnouncementsCache();
    return { success: true };
  });

/** Delete an Announcement */
export const deleteAnnouncementAdmin = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator((data: unknown) => deleteAnnouncementSchema.parse(data))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await poolConnect;

    await db
      .request()
      .input("id", sql.UniqueIdentifier, data.id)
      .query(`DELETE FROM announcements WHERE id = @id`);

    invalidateAnnouncementsCache();
    return { success: true };
  });

/** Get Active Announcements for User Updates List */
export const getUserActiveAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    if (activeAnnouncementsCache && activeAnnouncementsCache.expiresAt > Date.now()) {
      return activeAnnouncementsCache.data;
    }

    try {
      const db = await poolConnect;
      const result = await db.request().query(`
        SELECT 
          id,
          title,
          description,
          category,
          post_type,
          badge,
          is_popup,
          is_active,
          created_at,
          expires_at
        FROM announcements
        WHERE is_active = 1
          AND (expires_at IS NULL OR expires_at > SYSDATETIMEOFFSET())
        ORDER BY created_at DESC
      `);

      const data = result.recordset.map((row) => ({
        ...row,
        id: String(row.id),
        is_popup: Boolean(row.is_popup),
        is_active: Boolean(row.is_active),
        created_at: new Date(row.created_at).toISOString(),
        expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      })) as Announcement[];

      activeAnnouncementsCache = { data, expiresAt: Date.now() + 60_000 };
      return data;
    } catch (err) {
      console.error("getUserActiveAnnouncements error:", err);
      return activeAnnouncementsCache?.data ?? [];
    }
  });

/** Get Active Popup Alerts for User Dashboard */
export const getUserPopupAlerts = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    if (popupAlertsCache && popupAlertsCache.expiresAt > Date.now()) {
      return popupAlertsCache.data;
    }

    try {
      const db = await poolConnect;
      const result = await db.request().query(`
        SELECT TOP 3
          id,
          title,
          description,
          category,
          post_type,
          badge,
          is_popup,
          created_at,
          expires_at
        FROM announcements
        WHERE is_active = 1 AND is_popup = 1
          AND (expires_at IS NULL OR expires_at > SYSDATETIMEOFFSET())
        ORDER BY created_at DESC
      `);

      const data = result.recordset.map((row) => ({
        ...row,
        id: String(row.id),
        is_popup: Boolean(row.is_popup),
        created_at: new Date(row.created_at).toISOString(),
        expires_at: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      })) as Announcement[];

      popupAlertsCache = { data, expiresAt: Date.now() + 60_000 };
      return data;
    } catch (err) {
      console.error("getUserPopupAlerts error:", err);
      return popupAlertsCache?.data ?? [];
    }
  });
