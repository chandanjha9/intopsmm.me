import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createAndForwardOrder,
  requestOrderCancel,
  requestOrderRefill,
} from "./orders.server";

const createOrderSchema = z.object({
  serviceId: z.string().uuid(),
  link: z.string().trim().url({ message: "Enter a valid link" }).max(500),
  quantity: z.number().int().positive().max(10_000_000),
});

const orderIdSchema = z.object({ orderId: z.string().uuid() });

export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("services")
      .select(
        "id, name, category, platform, description, selling_rate, min_quantity, max_quantity, refill_supported, cancel_supported",
      )
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, service_name, link, quantity, charge, status, start_count, remains, created_at, error_message, service_id, services(refill_supported, cancel_supported), provider_orders(provider_order_id)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyRefills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("refill_requests")
      .select(
        "id, order_id, status, provider_refill_id, error_message, created_at, orders(service_name, link, quantity, provider_orders(provider_order_id))",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, description, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderIdSchema.parse(input))
  .handler(async ({ data, context }) => requestOrderRefill(context.userId, data.orderId));

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderIdSchema.parse(input))
  .handler(async ({ data, context }) => requestOrderCancel(context.userId, data.orderId));
