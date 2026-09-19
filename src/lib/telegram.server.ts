import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8992267163:AAFndnB3JvTAH4WllJ1e4BgIg4xaFFTj8n4";
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || "5987703894";
export const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || "@intopsmm";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

/**
 * Sends an instant payment approval notification to the admin on Telegram with 1-Click Approve/Reject buttons.
 */
export async function sendTelegramPaymentAlert(params: {
  paymentOrderId: string;
  orderRef: string;
  userEmail: string;
  amount: number;
  utrNumber: string;
}) {
  const message = `
🔔 <b>NEW UPI PAYMENT REQUEST</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> <code>${params.userEmail}</code>
💰 <b>Amount:</b> <b>₹${params.amount.toFixed(2)}</b>
🔢 <b>UTR / Ref:</b> <code>${params.utrNumber}</code>
🆔 <b>Order Ref:</b> <code>${params.orderRef}</code>
⏰ <b>Time:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "medium" })}
━━━━━━━━━━━━━━━━━━━━━
👉 <i>Check your PhonePe / Bank SMS statement and tap Approve or Reject below:</i>
`.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "✅ Approve (Add Balance)", callback_data: `appr_${params.paymentOrderId}` },
        { text: "❌ Reject (Fake UTR)", callback_data: `rejc_${params.paymentOrderId}` },
      ],
    ],
  };

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.warn("[telegram] Failed to send alert:", data);
    }
    return data.ok;
  } catch (err) {
    console.error("[telegram] Send message error:", err);
    return false;
  }
}
/**
 * Sends a low provider balance alert to admin on Telegram with 1-Click Process/Refund buttons.
 */
export async function sendTelegramLowBalanceAlert(params: {
  orderId: string;
  userEmail: string;
  serviceName: string;
  quantity: number;
  charge: number;
  link: string;
  reason?: string;
}) {
  const shortId = params.orderId.slice(0, 8);
  const message = `
⚠️ <b>PROVIDER BALANCE LOW — ORDER QUEUED!</b>
━━━━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> <code>#${shortId}</code> (${params.orderId})
👤 <b>User:</b> <code>${params.userEmail}</code>
🛠 <b>Service:</b> ${params.serviceName}
🔢 <b>Quantity:</b> ${params.quantity.toLocaleString("en-IN")}
💰 <b>User Charged:</b> <b>₹${params.charge.toFixed(4)}</b>
🔗 <b>Link:</b> <code>${params.link}</code>
━━━━━━━━━━━━━━━━━━━━━
<i>Reason: ${params.reason || "Provider account has insufficient funds. Order is held in Admin Queue."}
Please recharge your SMM provider account and click "Process Order" below:</i>
`.trim();

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "🚀 Process Order", callback_data: `pord_${params.orderId}` },
        { text: "❌ Refund Order", callback_data: `cord_${params.orderId}` },
      ],
    ],
  };

  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: message,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard,
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.warn("[telegram] Failed to send low balance alert:", data);
    }
    return data.ok;
  } catch (err) {
    console.error("[telegram] Low balance alert send error:", err);
    return false;
  }
}

/**
 * General helper to send any HTML message to admin Telegram.
 */
export async function sendTelegramMessage(htmlText: string, replyMarkup?: unknown) {
  try {
    const body: Record<string, unknown> = {
      chat_id: TELEGRAM_ADMIN_CHAT_ID,
      text: htmlText,
      parse_mode: "HTML",
    };
    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn("[telegram] Failed to send message:", data);
    }
    return data.ok;
  } catch (err) {
    console.error("[telegram] Send message error:", err);
    return false;
  }
}

/**
 * Broadcasts an update or promotion directly to the public Telegram channel (@intopsmm).
 */
export async function sendTelegramChannelBroadcast(params: {
  message: string;
  buttonText?: string;
  buttonUrl?: string;
}) {
  try {
    const payload: Record<string, unknown> = {
      chat_id: TELEGRAM_CHANNEL_ID,
      text: params.message,
      parse_mode: "HTML",
      disable_web_page_preview: false,
    };

    if (params.buttonText && params.buttonUrl) {
      payload.reply_markup = {
        inline_keyboard: [
          [{ text: params.buttonText, url: params.buttonUrl }],
        ],
      };
    }

    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!data.ok) {
      console.warn("[telegram channel broadcast] Failed to post to channel:", data);
    }
    return data.ok;
  } catch (err) {
    console.error("[telegram channel broadcast] Send error:", err);
    return false;
  }
}

/**
 * Sends a notification for a newly placed order.
 */
export async function sendTelegramNewOrderAlert(params: {
  orderId: string;
  userEmail: string;
  serviceName: string;
  quantity: number;
  charge: number;
  link: string;
  providerStatus: string;
}) {
  const shortId = params.orderId.slice(0, 8);
  const message = `
🛒 <b>NEW ORDER PLACED!</b>
━━━━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> <code>#${shortId}</code>
👤 <b>User:</b> <code>${params.userEmail}</code>
🛠 <b>Service:</b> ${params.serviceName}
🔢 <b>Quantity:</b> ${params.quantity.toLocaleString("en-IN")}
💰 <b>Amount:</b> <b>₹${params.charge.toFixed(4)}</b>
🔗 <b>Link:</b> <code>${params.link}</code>
📊 <b>Status:</b> ${params.providerStatus}
⏰ <b>Time:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "medium" })}
━━━━━━━━━━━━━━━━━━━━━
`.trim();

  return sendTelegramMessage(message);
}

/**
 * Sends a notification when a new user registers.
 */
export async function sendTelegramSignupAlert(params: {
  email: string;
  username?: string;
  fullName?: string;
  method?: "Email & Password" | "Google OAuth";
}) {
  const message = `
🎉 <b>NEW USER REGISTERED!</b>
━━━━━━━━━━━━━━━━━━━━━
👤 <b>Username:</b> <code>${params.username || "N/A"}</code>
📧 <b>Email:</b> <code>${params.email}</code>
🏷️ <b>Name:</b> ${params.fullName || "N/A"}
🔑 <b>Method:</b> ${params.method || "Email"}
⏰ <b>Time:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "medium" })}
━━━━━━━━━━━━━━━━━━━━━
`.trim();

  return sendTelegramMessage(message);
}

/**
 * Sends a notification when a user requests an order refill.
 */
export async function sendTelegramRefillAlert(params: {
  orderId: string;
  userEmail: string;
  refillId?: string;
  serviceName?: string;
}) {
  const shortId = params.orderId.slice(0, 8);
  const message = `
🔄 <b>NEW REFILL REQUEST!</b>
━━━━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> <code>#${shortId}</code>
👤 <b>User:</b> <code>${params.userEmail}</code>
${params.serviceName ? `🛠 <b>Service:</b> ${params.serviceName}\n` : ""}⏰ <b>Time:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "medium" })}
━━━━━━━━━━━━━━━━━━━━━
`.trim();

  return sendTelegramMessage(message);
}

/**
 * Sends a notification when an order fails or gets auto-refunded.
 */
export async function sendTelegramOrderFailedAlert(params: {
  orderId: string;
  userEmail: string;
  serviceName: string;
  reason: string;
  charge: number;
}) {
  const shortId = params.orderId.slice(0, 8);
  const message = `
🚨 <b>ORDER FAILED & REFUNDED!</b>
━━━━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> <code>#${shortId}</code>
👤 <b>User:</b> <code>${params.userEmail}</code>
🛠 <b>Service:</b> ${params.serviceName}
💰 <b>Refunded:</b> ₹${params.charge.toFixed(4)}
⚠️ <b>Reason:</b> <code>${params.reason}</code>
⏰ <b>Time:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "medium" })}
━━━━━━━━━━━━━━━━━━━━━
`.trim();

  return sendTelegramMessage(message);
}

/**
 * Handles incoming Telegram webhook updates (button clicks on Approve/Reject).
 */
export async function handleTelegramWebhook(update: any) {
  if (update.callback_query) {
    const callbackQuery = update.callback_query;
    const data = String(callbackQuery.data || "");
    const callbackId = callbackQuery.id;
    const messageId = callbackQuery.message?.message_id;
    const chatId = callbackQuery.message?.chat?.id;
    const fromId = callbackQuery.from?.id;

    // Security Check: Strictly authorize only the configured Admin Chat ID
    const senderId = String(fromId || chatId || "");
    if (senderId !== String(TELEGRAM_ADMIN_CHAT_ID)) {
      console.warn(`[telegram security alert] Blocked unauthorized attempt from sender ID: ${senderId}`);
      if (callbackId) {
        await answerCallbackQuery(callbackId, "⛔ Access Denied: You are not authorized to perform admin actions.");
      }
      return new Response("Unauthorized", { status: 403 });
    }

    const db = await poolConnect;

    if (data.startsWith("appr_")) {
      const paymentOrderId = data.replace("appr_", "");

      // Fetch payment order
      const res = await db
        .request()
        .input("id", sql.UniqueIdentifier, paymentOrderId)
        .query(`
          SELECT p.id, p.amount, p.status, p.gateway_order_id, p.gateway_payment_id, u.email 
          FROM payment_orders p
          INNER JOIN users u ON p.user_id = u.id
          WHERE p.id = @id
        `);

      const order = res.recordset[0];
      if (!order) {
        await answerCallbackQuery(callbackId, "❌ Order not found or already processed.");
        return new Response("ok");
      }

      if (order.status === "paid") {
        await answerCallbackQuery(callbackId, "⚠️ Already Approved & Credited!");
        return new Response("ok");
      }

      const amount = Number(order.amount);

      // Credit wallet atomically
      await db
        .request()
        .input("gateway", sql.NVarChar, "upi_qr")
        .input("gatewayOrderId", sql.NVarChar, order.gateway_order_id)
        .input("gatewayPaymentId", sql.NVarChar, order.gateway_payment_id || "UTR-APPROVED")
        .input("amount", sql.Decimal(18, 4), amount)
        .output("success", sql.Bit)
        .execute("sp_credit_wallet_from_payment");

      await answerCallbackQuery(callbackId, `✅ Approved! ₹${amount} credited to ${order.email}`);

      // Update the Telegram message
      if (chatId && messageId) {
        await editMessageText(
          chatId,
          messageId,
          `
✅ <b>PAYMENT APPROVED & CREDITED</b> 🎉
━━━━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> <code>${order.email}</code>
💰 <b>Amount:</b> <b>₹${amount.toFixed(2)} Added to Wallet</b>
🔢 <b>UTR:</b> <code>${order.gateway_payment_id}</code>
🆔 <b>Order:</b> <code>${order.gateway_order_id}</code>
⏱️ <b>Processed At:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
━━━━━━━━━━━━━━━━━━━━━
<i>Balance has been credited to user account successfully.</i>
`.trim()
        );
      }

      return new Response("ok");
    }

    if (data.startsWith("rejc_")) {
      const paymentOrderId = data.replace("rejc_", "");

      const res = await db
        .request()
        .input("id", sql.UniqueIdentifier, paymentOrderId)
        .query(`
          SELECT p.id, p.amount, p.status, p.gateway_order_id, p.gateway_payment_id, u.email 
          FROM payment_orders p
          INNER JOIN users u ON p.user_id = u.id
          WHERE p.id = @id
        `);

      const order = res.recordset[0];
      if (!order) {
        await answerCallbackQuery(callbackId, "❌ Order not found.");
        return new Response("ok");
      }

      await db
        .request()
        .input("id", sql.UniqueIdentifier, paymentOrderId)
        .query("UPDATE payment_orders SET status = 'failed', error_message = 'Rejected by Admin (Invalid UTR)', updated_at = SYSDATETIMEOFFSET() WHERE id = @id");

      await answerCallbackQuery(callbackId, `❌ Rejected request for ₹${order.amount}`);

      if (chatId && messageId) {
        await editMessageText(
          chatId,
          messageId,
          `
❌ <b>PAYMENT REJECTED</b> (Fake / Invalid UTR)
━━━━━━━━━━━━━━━━━━━━━
👤 <b>User:</b> <code>${order.email}</code>
💰 <b>Amount:</b> ₹${Number(order.amount).toFixed(2)}
🔢 <b>Invalid UTR:</b> <code>${order.gateway_payment_id}</code>
🆔 <b>Order:</b> <code>${order.gateway_order_id}</code>
⏱️ <b>Rejected At:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
━━━━━━━━━━━━━━━━━━━━━
<i>No balance was added to the user wallet.</i>
`.trim()
        );
      }

      return new Response("ok");
    }

    // Process queued order
    if (data.startsWith("pord_")) {
      const orderId = data.replace("pord_", "");
      try {
        const { processSingleQueuedOrder } = await import("./orders.server");
        const result = await processSingleQueuedOrder(orderId);

        if (result.success) {
          await answerCallbackQuery(callbackId, `✅ Success! Order #${orderId.slice(0, 8)} forwarded to provider.`);
          if (chatId && messageId) {
            await editMessageText(
              chatId,
              messageId,
              `
✅ <b>ORDER PROCESSED & FORWARDED!</b> 🚀
━━━━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> <code>#${orderId.slice(0, 8)}</code>
📦 <b>Provider Order ID:</b> <code>#${result.providerOrderId || "N/A"}</code>
⏱️ <b>Processed At:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
━━━━━━━━━━━━━━━━━━━━━
<i>The queued order has been successfully submitted to your SMM provider.</i>
`.trim()
            );
          }
        } else {
          await answerCallbackQuery(callbackId, `⚠️ Failed: ${result.message}`);
        }
      } catch (err) {
        await answerCallbackQuery(callbackId, `❌ Error: ${err instanceof Error ? err.message : "Failed to process"}`);
      }
      return new Response("ok");
    }

    // Cancel and refund queued order
    if (data.startsWith("cord_")) {
      const orderId = data.replace("cord_", "");
      try {
        await db
          .request()
          .input("orderId", sql.UniqueIdentifier, orderId)
          .input("reason", sql.NVarChar, "Cancelled from Admin Telegram bot")
          .execute("sp_refund_order");

        await db
          .request()
          .input("orderId", sql.UniqueIdentifier, orderId)
          .input("status", sql.NVarChar, "canceled")
          .input("errorMessage", sql.NVarChar, "Cancelled and refunded by Admin via Telegram")
          .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
          .query("UPDATE orders SET status = @status, error_message = @errorMessage, updated_at = @updatedAt WHERE id = @orderId");

        await answerCallbackQuery(callbackId, `❌ Order #${orderId.slice(0, 8)} cancelled and refunded.`);

        if (chatId && messageId) {
          await editMessageText(
            chatId,
            messageId,
            `
❌ <b>QUEUED ORDER CANCELLED & REFUNDED</b>
━━━━━━━━━━━━━━━━━━━━━
🆔 <b>Order ID:</b> <code>#${orderId.slice(0, 8)}</code>
⏱️ <b>Cancelled At:</b> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
━━━━━━━━━━━━━━━━━━━━━
<i>The order was cancelled and the customer's wallet balance has been refunded.</i>
`.trim()
          );
        }
      } catch (err) {
        await answerCallbackQuery(callbackId, `❌ Refund Error: ${err instanceof Error ? err.message : "Failed to refund"}`);
      }
      return new Response("ok");
    }
  }

  return new Response("ok");
}


async function answerCallbackQuery(callbackQueryId: string, text: string) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: true }),
    });
  } catch (err) {
    console.error("[telegram] answerCallbackQuery error:", err);
  }
}

async function editMessageText(chatId: number | string, messageId: number, text: string) {
  try {
    await fetch(`${TELEGRAM_API}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("[telegram] editMessageText error:", err);
  }
}
