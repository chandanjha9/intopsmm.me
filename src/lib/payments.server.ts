import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";

const RAZORPAY_API = "https://api.razorpay.com/v1";

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Payments are not configured yet. Please try again later.");
  }
  return { keyId, keySecret };
}

async function razorpayFetch(path: string, init: RequestInit = {}) {
  const { keyId, keySecret } = credentials();
  const auth = btoa(`${keyId}:${keySecret}`);
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      ...(init.headers ?? {}),
    },
  });
  const body = await response.text();
  if (!response.ok) {
    console.error(`[razorpay] ${path} failed [${response.status}]: ${body}`);
    throw new Error("Payment gateway request failed. Please try again.");
  }
  return JSON.parse(body);
}

export type TopupSession = {
  paymentOrderId: string;
  gatewayOrderId: string;
  amount: number;
  keyId: string;
};

/** Creates a Razorpay order and records it locally in SQL Server so the webhook can credit the wallet. */
export async function createTopupSession(userId: string, amount: number): Promise<TopupSession> {
  const { keyId } = credentials();
  const db = await poolConnect;

  const receipt = `wallet_${Date.now()}_${userId.slice(0, 8)}`;
  const order = await razorpayFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      notes: { user_id: userId, purpose: "wallet_topup" },
    }),
  });

  const result = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("gateway", sql.NVarChar, "razorpay")
    .input("gatewayOrderId", sql.NVarChar, String(order.id))
    .input("amount", sql.Decimal(18, 4), amount)
    .input("currency", sql.NVarChar, "INR")
    .input("status", sql.NVarChar, "created")
    .query(`
      INSERT INTO payment_orders (user_id, gateway, gateway_order_id, amount, currency, status)
      OUTPUT INSERTED.id
      VALUES (@userId, @gateway, @gatewayOrderId, @amount, @currency, @status)
    `);

  const paymentOrderId = result.recordset[0]?.id;

  return {
    paymentOrderId,
    gatewayOrderId: String(order.id),
    amount,
    keyId,
  };
}

export async function getTopupStatus(userId: string, paymentOrderId: string) {
  const db = await poolConnect;
  const result = await db
    .request()
    .input("id", sql.UniqueIdentifier, paymentOrderId)
    .query("SELECT id, user_id, status, amount, error_message FROM payment_orders WHERE id = @id");

  const data = result.recordset[0];
  if (!data || data.user_id !== userId) throw new Error("Payment not found");
  return { status: data.status, amount: Number(data.amount), error: data.error_message };
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Verifies the Razorpay webhook signature and credits the wallet atomically using SQL Server Stored Procedure. */
export async function handleRazorpayWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });
  if (!signature) return new Response("Missing signature", { status: 401 });

  const expected = await hmacSha256Hex(secret, rawBody);
  if (!timingSafeEqual(signature, expected)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(rawBody) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          amount?: number;
          error_description?: string;
        };
      };
    };
  };

  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return new Response("ok");

  const db = await poolConnect;

  if (event.event === "payment.captured" || event.event === "order.paid") {
    try {
      await db
        .request()
        .input("gateway", sql.NVarChar, "razorpay")
        .input("gatewayOrderId", sql.NVarChar, payment.order_id)
        .input("gatewayPaymentId", sql.NVarChar, payment.id ?? "")
        .input("amount", sql.Decimal(18, 4), Number(payment.amount ?? 0) / 100)
        .output("success", sql.Bit)
        .execute("sp_credit_wallet_from_payment");

      return new Response("ok");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Credit failed";
      console.error("[razorpay] credit failed:", message);
      return new Response("credit failed", { status: 500 });
    }
  }

  if (event.event === "payment.failed") {
    await db
      .request()
      .input("gateway", sql.NVarChar, "razorpay")
      .input("gatewayOrderId", sql.NVarChar, payment.order_id)
      .input("errorMessage", sql.NVarChar, payment.error_description ?? "Payment failed")
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE payment_orders 
        SET status = 'failed', error_message = @errorMessage, updated_at = @updatedAt 
        WHERE gateway = @gateway AND gateway_order_id = @gatewayOrderId AND status <> 'paid'
      `);
  }

  return new Response("ok");
}
