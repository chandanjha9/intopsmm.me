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
  amount: number;
  keyId: string;
  qrDataUrl: string;
  upiIntentUrl?: string;
  expiresAt: number; // timestamp in ms (5 minutes)
};

/** Creates a Razorpay order, dynamic QR code with 5-minute expiry, and records it in SQL Server */
export async function createTopupSession(userId: string, amount: number): Promise<TopupSession> {
  const { keyId } = credentials();
  const db = await poolConnect;

  const receipt = `w_${Date.now()}_${userId.slice(0, 6)}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  // 1. Create standard Razorpay Order
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

  // 2. Try to create dynamic Razorpay QR Code if available, or generate standard UPI QR
  let qrDataUrl = "";
  let upiIntentUrl = "";

  try {
    const qrRes = await razorpayFetch("/payments/qr_codes", {
      method: "POST",
      body: JSON.stringify({
        type: "upi_qr",
        name: "GrowMeSMM Wallet",
        usage: "single_use",
        fixed_amount: true,
        payment_amount: Math.round(amount * 100),
        description: `Wallet Topup ₹${amount}`,
        close_by: Math.floor(expiresAt / 1000),
        notes: { user_id: userId, gateway_order_id: gatewayOrderId, purpose: "wallet_topup" },
      }),
    });

    if (qrRes && qrRes.image_url) {
      qrDataUrl = qrRes.image_url;
    }
  } catch (qrErr) {
    // If QR code API is not enabled on account, fallback to Razorpay standard payment link or UPI payload
    console.warn("[razorpay] qr_codes API fallback:", qrErr instanceof Error ? qrErr.message : qrErr);
  }

  // If no direct image URL returned by Razorpay API, generate QR data URL
  if (!qrDataUrl) {
    // Standard UPI URI format compatible with GPay, PhonePe, Paytm, BHIM
    // Note: If merchant VPA is configured or standard Razorpay checkout intent
    const vpa = process.env.UPI_VPA || "merchant@razorpay";
    upiIntentUrl = `upi://pay?pa=${vpa}&pn=GrowMeSMM&am=${amount.toFixed(2)}&cu=INR&tr=${gatewayOrderId}&tn=WalletTopup`;
    qrDataUrl = await QRCode.toDataURL(upiIntentUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 400,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  }

  // 3. Record in database
  const result = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("gateway", sql.NVarChar, "razorpay")
    .input("gatewayOrderId", sql.NVarChar, gatewayOrderId)
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
    gatewayOrderId,
    amount,
    keyId,
    qrDataUrl,
    upiIntentUrl,
    expiresAt,
  };
}

export async function getTopupStatus(userId: string, paymentOrderId: string) {
  const db = await poolConnect;
  const result = await db
    .request()
    .input("id", sql.UniqueIdentifier, paymentOrderId)
    .query("SELECT id, user_id, status, amount, error_message, updated_at FROM payment_orders WHERE id = @id");

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
          notes?: Record<string, string>;
        };
      };
      qr_code?: {
        entity?: {
          id?: string;
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

  // Handle QR Code credited event
  if (event.event === "qr_code.credited") {
    const qrEntity = event.payload?.qr_code?.entity;
    const payment = event.payload?.payment?.entity;
    const orderId = qrEntity?.notes?.gateway_order_id || payment?.order_id;
    const amount = Number(payment?.amount ?? 0) / 100;

    if (orderId && amount > 0) {
      try {
        await db
          .request()
          .input("gateway", sql.NVarChar, "razorpay")
          .input("gatewayOrderId", sql.NVarChar, orderId)
          .input("gatewayPaymentId", sql.NVarChar, payment?.id ?? qrEntity?.id ?? "")
          .input("amount", sql.Decimal(18, 4), amount)
          .output("success", sql.Bit)
          .execute("sp_credit_wallet_from_payment");

        return new Response("ok");
      } catch (err: unknown) {
        console.error("[razorpay] qr_code credit failed:", err);
      }
    }
  }

  // Handle standard payment captured or order paid
  const payment = event.payload?.payment?.entity;
  const order = event.payload?.order?.entity;
  const targetOrderId = payment?.order_id || order?.id;

  if (targetOrderId && (event.event === "payment.captured" || event.event === "order.paid")) {
    try {
      const amount = Number(payment?.amount ?? order?.amount ?? 0) / 100;
      await db
        .request()
        .input("gateway", sql.NVarChar, "razorpay")
        .input("gatewayOrderId", sql.NVarChar, targetOrderId)
        .input("gatewayPaymentId", sql.NVarChar, payment?.id ?? "")
        .input("amount", sql.Decimal(18, 4), amount)
        .output("success", sql.Bit)
        .execute("sp_credit_wallet_from_payment");

      return new Response("ok");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Credit failed";
      console.error("[razorpay] credit failed:", message);
      return new Response("credit failed", { status: 500 });
    }
  }

  if (event.event === "payment.failed" && payment?.order_id) {
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
