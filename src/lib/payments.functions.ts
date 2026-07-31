import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createTopupSession, getTopupStatus } from "./payments.server";

const amountSchema = z.object({
  amount: z.number().positive().min(20, "Minimum top-up is ₹20").max(200000),
});

const statusSchema = z.object({ paymentOrderId: z.string().uuid() });

export const createWalletTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => amountSchema.parse(input))
  .handler(async ({ data, context }) => createTopupSession(context.userId, data.amount));

export const checkWalletTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => getTopupStatus(context.userId, data.paymentOrderId));

export const listMyTopups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("payment_orders")
      .select("id, amount, status, gateway_payment_id, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
