import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import QRCode from "qrcode";

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
    throw new Error(`Razorpay request failed [${response.status}]: ${body}`);
  }
  return JSON.parse(body);
}

export type TopupSession = {
  paymentOrderId: string;
  gatewayOrderId: string;
  paymentLinkId: string;
  amount: number;
  keyId: string;
  qrDataUrl: string;
  shortUrl: string;
  upiIntentUrl?: string;
  expiresAt: number; // timestamp in ms (5 minutes UI timer)
};

/**
 * Creates an official Razorpay UPI Payment Link with `upi_link: true`.
 *
 * This generates a Razorpay-hosted payment page that:
 *  - On mobile: opens PhonePe / GPay / Paytm / BHIM natively (no "leaving app" warning)
 *  - On desktop: shows a UPI QR code on Razorpay's own page
 *  - Auto-verifies payment via webhook (payment_link.paid / payment.captured)
 *
 * The QR code displayed on our site encodes the Razorpay `short_url` so that
 * scanning from any camera/QR scanner opens the Razorpay page which then
 * invokes the user's UPI app natively.
 */
export async function createTopupSession(userId: string, amount: number): Promise<TopupSession> {
  const { keyId } = credentials();
  const db = await poolConnect;

  const receipt = `w_${Date.now()}_${userId.slice(0, 6)}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes UI countdown
  // Razorpay requires minimum 15 min for payment link expiry
  const expireByUnix = Math.floor(Date.now() / 1000) + 16 * 60;

  // 1. Create official Razorpay Order (for tracking)
  const order = await razorpayFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      notes: { user_id: userId, purpose: "wallet_topup" },
    }),
  });

  const gatewayOrderId = String(order.id);

  // 2. Create UPI Payment Link (upi_link: true makes it UPI-native on mobile)
  const plink = await razorpayFetch("/payment_links", {
    method: "POST",
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      accept_partial: false,
      description: `GrowMeSMM Wallet Top-Up ₹${amount}`,
      customer: {
        name: "Customer",
        email: "user@growmesmm.in",
      },
      notify: { sms: false, email: false },
      reminder_enable: false,
      expire_by: expireByUnix,
      upi_link: true, // KEY: Makes the link UPI-native — no "leaving app" warnings
      notes: {
        user_id: userId,
        gateway_order_id: gatewayOrderId,
        purpose: "wallet_topup",
      },
      callback_url: "https://intopsmm-me.onrender.com/dashboard/add-funds",
      callback_method: "get",
    }),
  });

  const shortUrl = plink.short_url;
  const paymentLinkId = plink.id;

  // 3. Generate High-Resolution QR Code of the Razorpay payment link
  // When scanned, this opens Razorpay's UPI-optimized mobile page
  // which directly invokes PhonePe/GPay/Paytm without browser redirect warnings
  const qrDataUrl = await QRCode.toDataURL(shortUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // 4. Record in database
  const result = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("gateway", sql.NVarChar, "razorpay")
    .input("gatewayOrderId", sql.NVarChar, gatewayOrderId)
    .input("gatewayPaymentId", sql.NVarChar, paymentLinkId)
    .input("amount", sql.Decimal(18, 4), amount)
    .input("currency", sql.NVarChar, "INR")
    .input("status", sql.NVarChar, "created")
    .query(`
      INSERT INTO payment_orders (user_id, gateway, gateway_order_id, gateway_payment_id, amount, currency, status)
      OUTPUT INSERTED.id
      VALUES (@userId, @gateway, @gatewayOrderId, @gatewayPaymentId, @amount, @currency, @status)
    `);

  const paymentOrderId = result.recordset[0]?.id;

  return {
    paymentOrderId,
    gatewayOrderId,
    paymentLinkId,
    amount,
    keyId,
    qrDataUrl,
    shortUrl,
    upiIntentUrl: shortUrl, // Opens Razorpay's UPI-native page on mobile
    expiresAt,
  };
}

/** Also polls Razorpay API to check payment link status (in addition to webhook) */
export async function getTopupStatus(userId: string, paymentOrderId: string) {
  const db = await poolConnect;
  const result = await db
    .request()
    .input("id", sql.UniqueIdentifier, paymentOrderId)
    .query("SELECT id, user_id, status, amount, error_message, gateway_payment_id, updated_at FROM payment_orders WHERE id = @id");

  const data = result.recordset[0];
  if (!data || data.user_id !== userId) throw new Error("Payment not found");

  // If DB already says paid, return immediately
  if (data.status === "paid") {
    return { status: "paid" as const, amount: Number(data.amount), error: data.error_message };
  }

  // Otherwise, also check Razorpay Payment Link status directly (backup for webhook delays)
  if (data.gateway_payment_id && data.status === "created") {
    try {
      const plink = await razorpayFetch(`/payment_links/${data.gateway_payment_id}`);
      if (plink.status === "paid" && plink.amount_paid > 0) {
        // Credit wallet directly since webhook may be delayed
        const amount = Number(plink.amount_paid) / 100;
        const gatewayOrderId = plink.notes?.gateway_order_id || data.gateway_order_id;
        try {
          await db
            .request()
            .input("gateway", sql.NVarChar, "razorpay")
            .input("gatewayOrderId", sql.NVarChar, gatewayOrderId)
            .input("gatewayPaymentId", sql.NVarChar, data.gateway_payment_id)
            .input("amount", sql.Decimal(18, 4), amount)
            .output("success", sql.Bit)
            .execute("sp_credit_wallet_from_payment");
        } catch {
          // SP might fail if already credited by webhook — that's OK
        }
        return { status: "paid" as const, amount, error: null };
      }
    } catch {
      // API check failed, rely on webhook
    }
  }

  return { status: data.status as string, amount: Number(data.amount), error: data.error_message };
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

/** Verifies the Razorpay webhook signature and credits the wallet atomically. */
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
          notes?: Record<string, string>;
        };
      };
      payment_link?: {
        entity?: {
          id?: string;
          amount?: number;
          amount_paid?: number;
          notes?: Record<string, string>;
        };
      };
      order?: {
        entity?: {
          id?: string;
          amount?: number;
          notes?: Record<string, string>;
        };
      };
    };
  };

  const db = await poolConnect;

  const payment = event.payload?.payment?.entity;
  const plink = event.payload?.payment_link?.entity;
  const order = event.payload?.order?.entity;

  const targetOrderId =
    payment?.order_id ||
    plink?.notes?.gateway_order_id ||
    order?.id ||
    "";

  const targetPaymentLinkId = plink?.id || "";

  if (
    event.event === "payment_link.paid" ||
    event.event === "payment.captured" ||
    event.event === "order.paid"
  ) {
    try {
      const amount = Number(payment?.amount ?? plink?.amount_paid ?? plink?.amount ?? order?.amount ?? 0) / 100;
      const paymentId = payment?.id ?? targetPaymentLinkId ?? "";

      // Try credit by gateway_order_id (from notes)
      if (targetOrderId && amount > 0) {
        await db
          .request()
          .input("gateway", sql.NVarChar, "razorpay")
          .input("gatewayOrderId", sql.NVarChar, targetOrderId)
          .input("gatewayPaymentId", sql.NVarChar, paymentId)
          .input("amount", sql.Decimal(18, 4), amount)
          .output("success", sql.Bit)
          .execute("sp_credit_wallet_from_payment");

        return new Response("ok");
      }

      // Fallback: match by payment_link ID stored in gateway_payment_id column
      if (targetPaymentLinkId && amount > 0) {
        const row = await db
          .request()
          .input("gatewayPaymentId", sql.NVarChar, targetPaymentLinkId)
          .query("SELECT gateway_order_id FROM payment_orders WHERE gateway_payment_id = @gatewayPaymentId");

        const foundOrderId = row.recordset[0]?.gateway_order_id;
        if (foundOrderId) {
          await db
            .request()
            .input("gateway", sql.NVarChar, "razorpay")
            .input("gatewayOrderId", sql.NVarChar, foundOrderId)
            .input("gatewayPaymentId", sql.NVarChar, paymentId)
            .input("amount", sql.Decimal(18, 4), amount)
            .output("success", sql.Bit)
            .execute("sp_credit_wallet_from_payment");
          return new Response("ok");
        }
      }

      return new Response("ok");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Credit failed";
      console.error("[razorpay] credit failed:", message);
      return new Response("credit failed", { status: 500 });
    }
  }

  if (event.event === "payment.failed" && (payment?.order_id || targetOrderId)) {
    const orderId = payment?.order_id || targetOrderId;
    await db
      .request()
      .input("gateway", sql.NVarChar, "razorpay")
      .input("gatewayOrderId", sql.NVarChar, orderId)
      .input("errorMessage", sql.NVarChar, payment?.error_description ?? "Payment failed")
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE payment_orders 
        SET status = 'failed', error_message = @errorMessage, updated_at = @updatedAt 
        WHERE gateway = @gateway AND gateway_order_id = @gatewayOrderId AND status <> 'paid'
      `);
  }

  return new Response("ok");
}
