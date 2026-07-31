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

/** Creates a Razorpay order and records it locally so the webhook can credit the wallet. */
export async function createTopupSession(userId: string, amount: number): Promise<TopupSession> {
  const { keyId } = credentials();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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

  const { data, error } = await supabaseAdmin
    .from("payment_orders")
    .insert({
      user_id: userId,
      gateway: "razorpay",
      gateway_order_id: String(order.id),
      amount,
      currency: "INR",
      status: "created",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return {
    paymentOrderId: data.id,
    gatewayOrderId: String(order.id),
    amount,
    keyId,
  };
}

export async function getTopupStatus(userId: string, paymentOrderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("payment_orders")
    .select("id, user_id, status, amount, error_message")
    .eq("id", paymentOrderId)
    .maybeSingle();
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

/** Verifies the Razorpay webhook signature and credits the wallet exactly once. */
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

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const { error } = await supabaseAdmin.rpc("credit_wallet_from_payment", {
      _gateway: "razorpay",
      _gateway_order_id: payment.order_id,
      _gateway_payment_id: payment.id ?? "",
      _amount: Number(payment.amount ?? 0) / 100,
    });
    if (error) {
      console.error("[razorpay] credit failed:", error.message);
      return new Response("credit failed", { status: 500 });
    }
    return new Response("ok");
  }

  if (event.event === "payment.failed") {
    await supabaseAdmin
      .from("payment_orders")
      .update({ status: "failed", error_message: payment.error_description ?? "Payment failed" })
      .eq("gateway", "razorpay")
      .eq("gateway_order_id", payment.order_id)
      .neq("status", "paid");
  }

  return new Response("ok");
}
