import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import QRCode from "qrcode";
import { sendTelegramPaymentAlert } from "./telegram.server";

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

  const upiVpa = process.env.UPI_VPA || "chandankrjha45@pingpay";
  const upiName = process.env.UPI_NAME || "Intopsmm";

  const orderRef = `GMSMM${Date.now().toString().slice(-8)}`;
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  // Pure standard compliant UPI Deep-Link specification (avoids NPCI/Bank security block on P2P VPAs)
  const upiIntentUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}&am=${amount.toFixed(2)}&cu=INR`;

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
 * Submits the 12-digit UPI UTR / Transaction ID and notifies Admin on Telegram with 1-Click Approve/Reject buttons.
 */
export async function submitUtrForVerification(
  userId: string,
  params: {
    paymentOrderId: string;
    utrNumber: string;
  }
) {
  const cleanUtr = params.utrNumber.trim().toUpperCase();

  // Validate UTR format: 10 to 22 alphanumeric characters
  if (!/^[A-Z0-9]{10,22}$/.test(cleanUtr)) {
    throw new Error("Please enter a valid 12-digit UPI UTR / Transaction Ref ID from your payment receipt.");
  }

  const db = await poolConnect;

  // Check if UTR was already submitted on another order (paid or under_review)
  const checkDuplicate = await db
    .request()
    .input("utr", sql.NVarChar, cleanUtr)
    .query("SELECT id, status FROM payment_orders WHERE gateway_payment_id = @utr AND status IN ('paid', 'under_review')");

  if (checkDuplicate.recordset.length > 0) {
    const existing = checkDuplicate.recordset[0];
    if (existing.status === "paid") {
      throw new Error("This UTR / Transaction ID has already been credited to a wallet.");
    } else {
      throw new Error("This UTR / Transaction ID has already been submitted and is currently pending verification.");
    }
  }

  // Fetch payment order and user email from users table
  const orderRes = await db
    .request()
    .input("id", sql.UniqueIdentifier, params.paymentOrderId)
    .query(`
      SELECT p.id, p.user_id, p.amount, p.gateway_order_id, p.status, u.email
      FROM payment_orders p
      INNER JOIN users u ON p.user_id = u.id
      WHERE p.id = @id
    `);

  const record = orderRes.recordset[0];
  if (!record || record.user_id !== userId) {
    throw new Error("Payment session not found or expired.");
  }

  if (record.status === "paid") {
    return { status: "paid" as const, amount: Number(record.amount) };
  }

  // Update order status to 'under_review' with submitted UTR
  await db
    .request()
    .input("id", sql.UniqueIdentifier, params.paymentOrderId)
    .input("utr", sql.NVarChar, cleanUtr)
    .query("UPDATE payment_orders SET gateway_payment_id = @utr, status = 'under_review', updated_at = SYSDATETIMEOFFSET() WHERE id = @id");

  // Send instant push notification to Admin Telegram
  sendTelegramPaymentAlert({
    paymentOrderId: params.paymentOrderId,
    orderRef: record.gateway_order_id,
    userEmail: record.email || "User",
    amount: Number(record.amount),
    utrNumber: cleanUtr,
  }).catch((err) => console.error("[telegram] Alert error:", err));

  return { status: "under_review" as const, amount: Number(record.amount) };
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

/**
 * Submits UTR and amount for verification against static QR code payments.
 */
export async function submitStaticUtrVerification(
  userId: string,
  params: {
    amount: number;
    utrNumber: string;
  }
) {
  const amount = Number(params.amount);
  if (isNaN(amount) || amount < 15) {
    throw new Error("Minimum top-up amount is ₹15.");
  }
  if (amount > 200000) {
    throw new Error("Maximum top-up amount is ₹2,00,000.");
  }

  const cleanUtr = params.utrNumber.trim().toUpperCase();
  if (!/^[A-Z0-9]{10,22}$/.test(cleanUtr)) {
    throw new Error("Please enter a valid 10 to 22-digit UPI UTR / Transaction Ref ID.");
  }

  const db = await poolConnect;

  // Check if UTR was already submitted on another order (paid or under_review)
  const checkDuplicate = await db
    .request()
    .input("utr", sql.NVarChar, cleanUtr)
    .query("SELECT id, status FROM payment_orders WHERE gateway_payment_id = @utr AND status IN ('paid', 'under_review')");

  if (checkDuplicate.recordset.length > 0) {
    const existing = checkDuplicate.recordset[0];
    if (existing.status === "paid") {
      throw new Error("This UTR / Transaction ID has already been credited to a wallet.");
    } else {
      throw new Error("This UTR / Transaction ID has already been submitted and is currently pending verification.");
    }
  }

  const orderRef = `GMSMM${Date.now().toString().slice(-8)}`;

  // Insert payment order directly as 'under_review'
  const result = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("gateway", sql.NVarChar, "upi_qr")
    .input("gatewayOrderId", sql.NVarChar, orderRef)
    .input("gatewayPaymentId", sql.NVarChar, cleanUtr)
    .input("amount", sql.Decimal(18, 4), amount)
    .input("currency", sql.NVarChar, "INR")
    .input("status", sql.NVarChar, "under_review")
    .query(`
      INSERT INTO payment_orders (user_id, gateway, gateway_order_id, gateway_payment_id, amount, currency, status)
      OUTPUT INSERTED.id
      VALUES (@userId, @gateway, @gatewayOrderId, @gatewayPaymentId, @amount, @currency, @status)
    `);

  const paymentOrderId = result.recordset[0]?.id;

  // Fetch user email
  const userRes = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .query("SELECT email FROM users WHERE id = @userId");

  const userEmail = userRes.recordset[0]?.email || "User";

  // Send instant push notification to Admin Telegram
  sendTelegramPaymentAlert({
    paymentOrderId,
    orderRef,
    userEmail,
    amount,
    utrNumber: cleanUtr,
  }).catch((err) => console.error("[telegram] Alert error:", err));

  return { paymentOrderId, status: "under_review" as const, amount };
}

/**
 * Generates static QR info for the client based on server configuration.
 */
export async function getStaticQrInfo() {
  const upiVpa = process.env.UPI_VPA || "chandankrjha45@pingpay";
  const upiName = process.env.UPI_NAME || "Intopsmm";
  const upiIntentUrl = `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(upiName)}`;

  const qrDataUrl = await QRCode.toDataURL(upiIntentUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  return {
    upiVpa,
    upiName,
    qrDataUrl,
  };
}

/** Webhook handler stub */
export async function handleRazorpayWebhook(_rawBody: string, _signature: string | null) {
  return new Response("ok");
}
