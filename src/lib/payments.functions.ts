import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { requireAuth } from "./auth/auth-middleware";
import { createTopupSession, getTopupStatus, verifyAndCreditUtr } from "./payments.server";

const amountSchema = z.object({
  amount: z.number().positive().min(1, "Minimum top-up is ₹1").max(200000),
});

const statusSchema = z.object({ paymentOrderId: z.string().uuid() });

const utrSchema = z.object({
  paymentOrderId: z.string().uuid(),
  utrNumber: z.string().min(6, "Enter a valid 12-digit UTR/Transaction number").max(30),
});

export const createWalletTopup = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => amountSchema.parse(input))
  .handler(async ({ data, context }) => createTopupSession(context.userId, data.amount));

export const submitUpiUtr = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => utrSchema.parse(input))
  .handler(async ({ data, context }) =>
    verifyAndCreditUtr(context.userId, {
      paymentOrderId: data.paymentOrderId,
      utrNumber: data.utrNumber,
    })
  );

export const checkWalletTopup = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => getTopupStatus(context.userId, data.paymentOrderId));

export const listMyTopups = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    const db = await poolConnect;
    const result = await db
      .request()
      .input("userId", sql.UniqueIdentifier, context.userId)
      .query(`
        SELECT TOP 30
          id,
          amount,
          status,
          gateway_payment_id,
          created_at
        FROM payment_orders
        WHERE user_id = @userId AND status = 'paid'
        ORDER BY created_at DESC
      `);

    return result.recordset.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      status: row.status,
      gateway_payment_id: row.gateway_payment_id,
      created_at: row.created_at,
    }));
  });
