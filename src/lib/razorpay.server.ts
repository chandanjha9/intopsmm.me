import sql from "mssql";
import { createHmac, timingSafeEqual } from "crypto";
import { poolConnect } from "@/integrations/sqlServer/client";

function creds() {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured yet. Please use the UPI QR option.");
  }
  return { keyId, keySecret };
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Creates a Razorpay order and records it locally as a pending payment order. */
export async function createRazorpayOrder(userId: string, amount: number) {
  const { keyId, keySecret } = creds();
  const receipt = `RZP${Date.now().toString().slice(-10)}`;

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt,
      notes: { user_id: userId },
    }),
  });

  const order = (await res.json()) as { id?: string; error?: { description?: string } };
  if (!res.ok || !order.id) {
    throw new Error(order?.error?.description || "Could not start the Razorpay payment. Please try again.");
  }

  const db = await poolConnect;
  const inserted = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("gateway", sql.NVarChar, "razorpay")
    .input("gatewayOrderId", sql.NVarChar, order.id)
    .input("gatewayPaymentId", sql.NVarChar, "")
    .input("amount", sql.Decimal(18, 4), amount)
    .input("currency", sql.NVarChar, "INR")
    .input("status", sql.NVarChar, "created")
    .query(`
      INSERT INTO payment_orders (user_id, gateway, gateway_order_id, gateway_payment_id, amount, currency, status)
      OUTPUT INSERTED.id
      VALUES (@userId, @gateway, @gatewayOrderId, @gatewayPaymentId, @amount, @currency, @status)
    `);

  return {
    paymentOrderId: inserted.recordset[0]?.id as string,
    razorpayOrderId: order.id,
    keyId,
    amount,
  };
}

async function creditOnce(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
}): Promise<{ credited: boolean; amount: number }> {
  const db = await poolConnect;
  const found = await db
    .request()
    .input("orderId", sql.NVarChar, params.razorpayOrderId)
    .query(
      `SELECT TOP 1 id, amount, status FROM payment_orders WHERE gateway_order_id = @orderId AND gateway = 'razorpay'`,
    );

  const row = found.recordset[0];
  if (!row) throw new Error("Payment record not found.");
  const amount = Number(row.amount);
  if (row.status === "paid") return { credited: false, amount };

  await db
    .request()
    .input("gateway", sql.NVarChar, "razorpay")
    .input("gatewayOrderId", sql.NVarChar, params.razorpayOrderId)
    .input("gatewayPaymentId", sql.NVarChar, params.razorpayPaymentId)
    .input("amount", sql.Decimal(18, 4), amount)
    .output("success", sql.Bit)
    .execute("sp_credit_wallet_from_payment");

  return { credited: true, amount };
}

/** Verifies the checkout signature returned by Razorpay Checkout and credits the wallet. */
export async function verifyRazorpayPayment(
  userId: string,
  params: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string },
) {
  const { keySecret } = creds();
  const expected = createHmac("sha256", keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");

  if (!safeEqual(expected, params.razorpaySignature)) {
    throw new Error("Payment verification failed. If money was debited it will be auto-credited shortly.");
  }

  const db = await poolConnect;
  const owner = await db
    .request()
    .input("orderId", sql.NVarChar, params.razorpayOrderId)
    .query(`SELECT TOP 1 user_id FROM payment_orders WHERE gateway_order_id = @orderId AND gateway = 'razorpay'`);
  if (owner.recordset[0]?.user_id !== userId) throw new Error("Payment record not found.");

  const result = await creditOnce(params);
  return { status: "paid" as const, amount: result.amount };
}

/** Razorpay webhook: credits the wallet when a payment is captured. */
export async function handleRazorpayWebhookEvent(rawBody: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret || !signature) return new Response("Unauthorized", { status: 401 });

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!safeEqual(expected, signature)) return new Response("Invalid signature", { status: 401 });

  const payload = JSON.parse(rawBody) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string } } };
  };

  if (payload.event === "payment.captured") {
    const entity = payload.payload?.payment?.entity;
    if (entity?.order_id && entity.id) {
      try {
        await creditOnce({ razorpayOrderId: entity.order_id, razorpayPaymentId: entity.id });
      } catch (err) {
        console.error("[razorpay webhook] credit failed:", err);
      }
    }
  }

  return new Response("ok");
}
