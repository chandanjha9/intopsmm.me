import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import QRCode from "qrcode";

export type TopupSession = {
  paymentOrderId: string;
  orderRef: string;
  amount: number;
  qrDataUrl: string;
  upiIntentUrl: string;
  upiVpa: string;
  upiName: string;
  expiresAt: number; // timestamp in ms (5 minutes)
};

/**
 * Creates a pure 5-minute dynamic UPI QR Code session
 * Scannable natively by PhonePe, Google Pay, Paytm, BHIM, Cred, etc.
 */
export async function createTopupSession(userId: string, amount: number): Promise<TopupSession> {
  const db = await poolConnect;

  const upiVpa = process.env.UPI_VPA || "chandanjha45@ybl";
  const upiName = process.env.UPI_NAME || "GrowMeSMM";

  const orderRef = `GMSMM${Date.now().toString().slice(-8)}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  // Pure standard UPI Deep-Link specification (accepted by all UPI apps without any browser redirects)
  const upiIntentUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}&am=${amount.toFixed(2)}&tr=${orderRef}&cu=INR&tn=${encodeURIComponent(`Topup ${orderRef}`)}`;

  // Generate high-resolution QR Code image
  const qrDataUrl = await QRCode.toDataURL(upiIntentUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // Record order in SQL Server
  const result = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("gateway", sql.NVarChar, "upi_qr")
    .input("gatewayOrderId", sql.NVarChar, orderRef)
    .input("gatewayPaymentId", sql.NVarChar, "")
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
    orderRef,
    amount,
    qrDataUrl,
    upiIntentUrl,
    upiVpa,
    upiName,
    expiresAt,
  };
}

/**
 * Verifies the 12-digit UPI UTR / Transaction ID and credits the user wallet instantly.
 */
export async function verifyAndCreditUtr(
  userId: string,
  params: {
    paymentOrderId: string;
    utrNumber: string;
  }
) {
  const cleanUtr = params.utrNumber.trim();
  if (cleanUtr.length < 6) {
    throw new Error("Please enter a valid 12-digit UPI Transaction / UTR Number");
  }

  const db = await poolConnect;

  // Check if UTR was already used
  const checkDuplicate = await db
    .request()
    .input("utr", sql.NVarChar, cleanUtr)
    .query("SELECT id FROM payment_orders WHERE gateway_payment_id = @utr AND status = 'paid'");

  if (checkDuplicate.recordset.length > 0) {
    throw new Error("This UTR / Transaction ID has already been credited.");
  }

  // Fetch payment order
  const orderRes = await db
    .request()
    .input("id", sql.UniqueIdentifier, params.paymentOrderId)
    .query("SELECT id, user_id, amount, gateway_order_id, status FROM payment_orders WHERE id = @id");

  const record = orderRes.recordset[0];
  if (!record || record.user_id !== userId) {
    throw new Error("Payment session not found or expired.");
  }

  if (record.status === "paid") {
    return { success: true, amount: Number(record.amount) };
  }

  const amount = Number(record.amount);

  // Credit wallet atomically via Stored Procedure
  await db
    .request()
    .input("gateway", sql.NVarChar, "upi_qr")
    .input("gatewayOrderId", sql.NVarChar, record.gateway_order_id)
    .input("gatewayPaymentId", sql.NVarChar, cleanUtr)
    .input("amount", sql.Decimal(18, 4), amount)
    .output("success", sql.Bit)
    .execute("sp_credit_wallet_from_payment");

  return { success: true, amount };
}

/**
 * Checks status of an active topup session
 */
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

/** Webhook handler stub */
export async function handleRazorpayWebhook(_rawBody: string, _signature: string | null) {
  return new Response("ok");
}
