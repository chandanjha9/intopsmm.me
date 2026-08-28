import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { requireAuth } from "./auth/auth-middleware";
import {
  createAndForwardOrder,
  requestOrderCancel,
  requestOrderRefill,
} from "./orders.server";
import { syncOrderStatuses } from "./providers/sync.server";

const createOrderSchema = z.object({
  serviceId: z.string().uuid(),
  link: z.string().trim().url({ message: "Enter a valid link" }).max(500),
  quantity: z.number().int().positive().max(10_000_000),
});

const orderIdSchema = z.object({ orderId: z.string().uuid() });

export const listServices = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const db = await poolConnect;
    const result = await db.request().query(`
      SELECT 
        id, 
        name, 
        category, 
        platform, 
        description, 
        selling_rate, 
        min_quantity, 
        max_quantity, 
        refill_supported, 
        cancel_supported
      FROM services
      WHERE is_active = 1
      ORDER BY category ASC, name ASC
    `);

    return result.recordset.map((row) => ({
      ...row,
      selling_rate: Number(row.selling_rate),
      refill_supported: Boolean(row.refill_supported),
      cancel_supported: Boolean(row.cancel_supported),
    }));
  });

/** Platform-wide completed order counter (base offset + live rows). */
export const getTotalOrderCount = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async () => {
    const db = await poolConnect;
    const result = await db.request().query(`SELECT COUNT_BIG(*) AS total FROM orders`);
    return { total: 230826 + Number(result.recordset[0]?.total ?? 0) };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    // Trigger a live sync before querying so start_count, remains, and status
    // are always up-to-date when the user views order history or the refill page.
    try { await syncOrderStatuses(); } catch { /* non-fatal */ }
    const db = await poolConnect;
    const result = await db
      .request()
      .input("userId", sql.UniqueIdentifier, context.userId)
      .query(`
        SELECT TOP 200
          o.id,
          o.service_name,
          o.link,
          o.quantity,
          o.charge,
          o.status,
          o.start_count,
          o.remains,
          o.created_at,
          o.error_message,
          o.service_id,
          s.refill_supported,
          s.cancel_supported,
          po.provider_order_id
        FROM orders o
        LEFT JOIN services s ON o.service_id = s.id
        LEFT JOIN provider_orders po ON o.id = po.order_id
        WHERE o.user_id = @userId
        ORDER BY o.created_at DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id,
      service_name: row.service_name,
      link: row.link,
      quantity: row.quantity,
      charge: Number(row.charge),
      status: row.status,
      start_count: row.start_count,
      remains: row.remains,
      created_at: row.created_at,
      error_message: row.error_message,
      service_id: row.service_id,
      services: row.service_id
        ? {
            refill_supported: Boolean(row.refill_supported),
            cancel_supported: Boolean(row.cancel_supported),
          }
        : null,
      provider_orders: row.provider_order_id ? { provider_order_id: row.provider_order_id } : null,
    }));
  });

export const listMyRefills = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    try { await syncOrderStatuses(); } catch { /* non-fatal */ }
    const db = await poolConnect;
    const result = await db
      .request()
      .input("userId", sql.UniqueIdentifier, context.userId)
      .query(`
        SELECT TOP 200
          r.id,
          r.order_id,
          r.status,
          r.provider_refill_id,
          r.error_message,
          r.created_at,
          o.service_name,
          o.link,
          o.quantity,
          po.provider_order_id
        FROM refill_requests r
        INNER JOIN orders o ON r.order_id = o.id
        LEFT JOIN provider_orders po ON o.id = po.order_id
        WHERE r.user_id = @userId
        ORDER BY r.created_at DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id,
      order_id: row.order_id,
      status: row.status,
      provider_refill_id: row.provider_refill_id,
      error_message: row.error_message,
      created_at: row.created_at,
      orders: {
        service_name: row.service_name,
        link: row.link,
        quantity: row.quantity,
        provider_orders: row.provider_order_id ? { provider_order_id: row.provider_order_id } : null,
      },
    }));
  });

export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await poolConnect;
    const result = await db
      .request()
      .input("userId", sql.UniqueIdentifier, context.userId)
      .query(`
        SELECT TOP 200
          id,
          type,
          amount,
          balance_after,
          description,
          created_at
        FROM wallet_transactions
        WHERE user_id = @userId
        ORDER BY created_at DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      balance_after: Number(row.balance_after),
      description: row.description,
      created_at: row.created_at,
    }));
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => createOrderSchema.parse(input))
  .handler(async ({ data, context }) =>
    createAndForwardOrder({
      userId: context.userId,
      serviceId: data.serviceId,
      link: data.link,
      quantity: data.quantity,
    }),
  );

export const refillOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => orderIdSchema.parse(input))
  .handler(async ({ data, context }) => requestOrderRefill(context.userId, data.orderId));

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => orderIdSchema.parse(input))
  .handler(async ({ data, context }) => requestOrderCancel(context.userId, data.orderId));
