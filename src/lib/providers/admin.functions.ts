import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { requireAuth } from "@/lib/auth/auth-middleware";
import { requireAdmin } from "@/lib/admin-guard.server";
import { checkUserRole } from "@/lib/auth/service.server";
import {
  fetchAdminOverview,
  fetchApiLogs,
  fetchInternalServices,
  fetchProviderCatalog,
  fetchProviders,
  removeInternalService,
  removeProvider,
  saveInternalService,
  saveProvider,
  testProviderConnection,
} from "./admin.server";
import {
  cleanOldLogs,
  importProviderServices,
  retryFailedOrders,
  syncOrderStatuses,
  syncProviderBalances,
} from "./sync.server";

const providerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(80),
  apiUrl: z.string().trim().url().max(300),
  apiKey: z.string().trim().min(8).max(300).optional(),
  priority: z.number().int().min(1).max(100),
  isActive: z.boolean(),
  timeoutMs: z.number().int().min(2000).max(120000),
  currency: z.string().trim().min(2).max(8),
});

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  providerId: z.string().uuid(),
  providerServiceId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(160),
  category: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(1).max(40),
  description: z.string().trim().max(500).optional(),
  markupType: z.enum(["percentage", "fixed"]),
  markupValue: z.number().min(0).max(100000),
  isActive: z.boolean(),
});

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const isAdmin = await checkUserRole(context.userId, "admin");
    return { isAdmin: isAdmin || context.user?.role === "admin" };
  });

export const adminListProviders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    return fetchProviders();
  });

export const adminSaveProvider = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => providerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    return saveProvider(data);
  });

export const adminDeleteProvider = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    await removeProvider(data.id);
    return { deleted: true };
  });

export const adminTestProvider = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    return testProviderConnection(data.id);
  });

export const adminImportServices = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ providerId: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    return importProviderServices(data.providerId ?? null);
  });

export const adminSyncBalances = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    return syncProviderBalances();
  });

export const adminSyncStatuses = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    return syncOrderStatuses();
  });

export const adminRetryFailedOrders = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    return retryFailedOrders();
  });

export const adminCleanLogs = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    return cleanOldLogs();
  });

export const adminListCatalog = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        providerId: z.string().uuid().optional(),
        search: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    return fetchProviderCatalog(data);
  });

export const adminListServices = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    return fetchInternalServices();
  });

export const adminSaveService = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => serviceSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    return saveInternalService(data);
  });

export const adminDeleteService = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    await removeInternalService(data.id);
    return { deleted: true };
  });

export const adminListLogs = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        action: z.string().trim().max(40).optional(),
        onlyErrors: z.boolean().default(false),
        limit: z.number().int().min(1).max(200).default(50),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    return fetchApiLogs(data);
  });

export const adminListAllOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        status: z.string().trim().max(20).optional(),
        search: z.string().trim().max(80).optional(),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await poolConnect;
    const request = db.request();
    request.input("limit", sql.Int, data.limit || 100);

    let where = "WHERE 1=1";
    if (data.status && data.status !== "all") {
      where += " AND o.status = @status";
      request.input("status", sql.NVarChar, data.status);
    }
    if (data.search) {
      where += " AND (u.email LIKE @search OR o.link LIKE @search OR o.service_name LIKE @search)";
      request.input("search", sql.NVarChar, `%${data.search}%`);
    }

    const result = await request.query(`
      SELECT TOP (@limit)
        o.id,
        o.user_id,
        o.service_name,
        o.link,
        o.quantity,
        o.charge,
        o.status,
        o.start_count,
        o.remains,
        o.error_message,
        o.created_at,
        o.updated_at,
        u.email AS user_email,
        po.provider_order_id
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN provider_orders po ON o.id = po.order_id
      ${where}
      ORDER BY o.created_at DESC
    `);

    return result.recordset.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_email: row.user_email,
      service_name: row.service_name,
      link: row.link,
      quantity: row.quantity,
      charge: Number(row.charge),
      status: row.status,
      start_count: row.start_count,
      remains: row.remains,
      error_message: row.error_message,
      created_at: row.created_at,
      updated_at: row.updated_at,
      provider_order_id: row.provider_order_id,
    }));
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(["pending", "in_progress", "processing", "completed", "partial", "canceled", "refunded", "failed"]),
        startCount: z.number().int().min(0).optional(),
        remains: z.number().int().min(0).optional(),
        errorMessage: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.userId);
    const db = await poolConnect;

    // Fetch current order status for history log
    const currentRes = await db
      .request()
      .input("orderId", sql.UniqueIdentifier, data.orderId)
      .query("SELECT status FROM orders WHERE id = @orderId");
    const fromStatus = currentRes.recordset[0]?.status ?? "unknown";

    const request = db.request();
    request.input("orderId", sql.UniqueIdentifier, data.orderId);
    request.input("status", sql.NVarChar, data.status);
    request.input("updatedAt", sql.DateTimeOffset, new Date().toISOString());

    let updateQuery = "UPDATE orders SET status = @status, updated_at = @updatedAt";
    if (data.startCount !== undefined) {
      request.input("startCount", sql.Int, data.startCount);
      updateQuery += ", start_count = @startCount";
    }
    if (data.remains !== undefined) {
      request.input("remains", sql.Int, data.remains);
      updateQuery += ", remains = @remains";
    }
    if (data.errorMessage !== undefined) {
      request.input("errorMessage", sql.NVarChar, data.errorMessage);
      updateQuery += ", error_message = @errorMessage";
    }
    updateQuery += " WHERE id = @orderId";
    await request.query(updateQuery);

    // Write history
    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, data.orderId)
      .input("fromStatus", sql.NVarChar, fromStatus)
      .input("toStatus", sql.NVarChar, data.status)
      .input("note", sql.NVarChar, "Manual status update by admin")
      .query(`
        INSERT INTO order_status_history (order_id, from_status, to_status, note)
        VALUES (@orderId, @fromStatus, @toStatus, @note)
      `);

    // Auto-refund if admin sets to canceled/refunded
    if (data.status === "canceled" || data.status === "refunded") {
      try {
        await db
          .request()
          .input("orderId", sql.UniqueIdentifier, data.orderId)
          .input("reason", sql.NVarChar, `Admin manually set status to ${data.status}`)
          .execute("sp_refund_order");
      } catch {
        // Already refunded is acceptable
      }
    }

    return { updated: true, orderId: data.orderId, status: data.status };
  });

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.userId);
    return fetchAdminOverview();
  });
