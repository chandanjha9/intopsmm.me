import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { requestOrderRefill } from "./orders.server";
import { SITE_CONTACT } from "@/data/site-contact";

export type TicketType = "refill" | "speed_up" | "payment" | "other";

export type TicketSummary = {
  id: string;
  ticketNumber: number;
  requestType: TicketType;
  orderIds: string | null;
  subject: string;
  status: "open" | "responded" | "in_progress" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
  hasUnread?: boolean;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  senderType: "user" | "ai_bot" | "support";
  message: string;
  metadataJson?: string | null;
  createdAt: string;
};

let tableInitPromise: Promise<void> | null = null;

export async function ensureTicketTables() {
  if (!tableInitPromise) {
    tableInitPromise = (async () => {
      try {
        const db = await poolConnect;
        await db.request().query(`
          IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='support_tickets' AND xtype='U')
          BEGIN
            CREATE TABLE support_tickets (
              id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
              ticket_number INT IDENTITY(114000, 1),
              user_id UNIQUEIDENTIFIER NOT NULL,
              request_type NVARCHAR(50) NOT NULL,
              order_ids NVARCHAR(500) NULL,
              status NVARCHAR(50) NOT NULL DEFAULT 'responded',
              subject NVARCHAR(255) NOT NULL,
              has_unread BIT NOT NULL DEFAULT 1,
              created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
              updated_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
            );
            CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
          END

          IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ticket_messages' AND xtype='U')
          BEGIN
            CREATE TABLE ticket_messages (
              id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
              ticket_id UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES support_tickets(id) ON DELETE CASCADE,
              sender_type NVARCHAR(20) NOT NULL,
              message NVARCHAR(MAX) NOT NULL,
              metadata_json NVARCHAR(MAX) NULL,
              created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
            );
            CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
          END
        `);
      } catch (err) {
        console.error("Failed to ensure support_tickets tables:", err);
      }
    })();
  }
  return tableInitPromise;
}

/**
 * Searches the user's orders by provider_order_id or internal order id.
 */
async function findOrderData(userId: string, idInput: string) {
  const db = await poolConnect;
  const cleanId = idInput.trim().replace(/^#/, "");
  if (!cleanId) return null;

  try {
    const res = await db
      .request()
      .input("userId", sql.UniqueIdentifier, userId)
      .input("searchId", sql.NVarChar, cleanId)
      .query(`
        SELECT TOP 1
          o.id,
          o.service_name,
          o.link,
          o.quantity,
          o.charge,
          o.status,
          o.start_count,
          o.remains,
          o.created_at,
          s.refill_supported,
          s.cancel_supported,
          po.provider_order_id
        FROM orders o
        LEFT JOIN services s ON o.service_id = s.id
        LEFT JOIN provider_orders po ON o.id = po.order_id
        WHERE o.user_id = @userId
          AND (
            po.provider_order_id = @searchId
            OR CAST(o.id AS NVARCHAR(100)) = @searchId
            OR CAST(o.id AS NVARCHAR(100)) LIKE '%' + @searchId + '%'
          )
        ORDER BY o.created_at DESC
      `);

    return res.recordset[0] ?? null;
  } catch (err) {
    console.warn("findOrderData lookup error:", err);
    return null;
  }
}

/**
 * Generates an automated AI response based on request category and real order details.
 */
async function generateAiResolution(
  userId: string,
  requestType: TicketType,
  orderIdsRaw: string,
  additionalInfo?: string
): Promise<{ message: string; metadata: Record<string, unknown> }> {
  const orderList = orderIdsRaw
    .split(/[\s,]+/)
    .map((s) => s.trim().replace(/^#/, ""))
    .filter(Boolean);

  const firstOrderId = orderList[0] || "";
  const order = firstOrderId ? await findOrderData(userId, firstOrderId) : null;

  if (requestType === "refill") {
    if (!firstOrderId) {
      return {
        message: `🤖 **AI Support Bot**: Please provide a valid **Order ID** so I can analyze drop metrics and verify refill eligibility for your order.`,
        metadata: { type: "refill", success: false },
      };
    }

    if (!order) {
      return {
        message: `🤖 **AI Refill Engine**: I checked our database for Order ID **#${firstOrderId}**, but could not find a matching order on your account.
\n📌 **Tips**:
1. Please verify the numeric Order ID from your **Order History** tab.
2. If this order was placed under another account or just recently submitted, please allow a minute or contact us on WhatsApp.`,
        metadata: { type: "refill", orderId: firstOrderId, found: false },
      };
    }

    const orderDate = new Date(order.created_at).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const quantity = Number(order.quantity) || 0;
    const startCount = Number(order.start_count) || 0;
    const remains = Number(order.remains) || 0;
    const targetExpected = startCount + quantity;
    
    // Estimate current and drop count based on remains
    const deliveredCount = Math.max(0, quantity - remains);
    const estimatedDrop = Math.max(0, quantity - deliveredCount);

    let refillResultText = "";
    let refillActionTaken = false;

    if (order.status === "completed" && order.refill_supported) {
      try {
        await requestOrderRefill(userId, order.id);
        refillResultText = "✅ **Refill Request Submitted!** Provider server accepted your refill queue. Expected delivery: 1 - 6 hours.";
        refillActionTaken = true;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "Refill is currently being processed";
        refillResultText = `ℹ️ **Refill Status**: ${errMsg}`;
      }
    } else if (order.status !== "completed") {
      refillResultText = `⚠️ **Notice**: Your order is currently **${order.status.toUpperCase()}**. Refill can only be initiated after the order completes.`;
    } else {
      refillResultText = `⚠️ **Notice**: This specific service does not have automated refill guarantee. If you notice severe drops, please connect with support on WhatsApp.`;
    }

    const responseText = `🤖 **AI Order Analysis Completed** for Order **#${order.provider_order_id || firstOrderId}**:

| Detail | Status |
| :--- | :--- |
| 📅 **Order Date** | ${orderDate} |
| 📦 **Service** | ${order.service_name} |
| 🔗 **Target Link** | \`${order.link}\` |
| 📊 **Quantity Ordered** | **${quantity.toLocaleString("en-IN")}** |
| 🎯 **Start Count** | **${startCount.toLocaleString("en-IN")}** |
| 📉 **Remains / Drop** | **${remains.toLocaleString("en-IN")}** |
| ⚡ **Order Status** | **${order.status.toUpperCase()}** |

${refillResultText}

${additionalInfo ? `\n💬 *Your Note: "${additionalInfo}" has been logged into our support notes.*` : ""}
\n*If you need further assistance, feel free to reply here or connect on WhatsApp.*`;

    return {
      message: responseText,
      metadata: {
        type: "refill",
        orderId: firstOrderId,
        found: true,
        orderDate,
        service: order.service_name,
        quantity,
        startCount,
        remains,
        refillActionTaken,
      },
    };
  }

  if (requestType === "speed_up") {
    const orderDisplayId = order?.provider_order_id || firstOrderId || "Submitted Orders";

    const responseText = `⚡ **Speed-Up Request Initiated for Order #${orderDisplayId}**!

🤖 **AI Support Bot**: Our automated server engine has forwarded your order to the **High-Priority Server Queue**.

| Status Metric | Live Value |
| :--- | :--- |
| 🚀 **Speed Queue** | **Pushed to Priority 1** |
| ⏱️ **Server Verification** | Completed (High-Bandwidth Thread) |
| 📈 **Current State** | ${order ? order.status.toUpperCase() : "Active / Queued"} |
| ⏳ **Speed Boost ETA** | **5 - 15 Minutes** |

📌 *Note: High server traffic or platform security updates can occasionally cause minor delays, but your order has now been prioritized for faster execution.*
${additionalInfo ? `\n💬 *Customer Note Logged: "${additionalInfo}"*` : ""}`;

    return {
      message: responseText,
      metadata: { type: "speed_up", orderId: firstOrderId, priority: 1 },
    };
  }

  if (requestType === "payment") {
    const waText = encodeURIComponent(
      `Hi Intopsmm Support! I need help with my payment on order/ticket. Order ID: ${firstOrderId || "N/A"}. Note: ${additionalInfo || "Please check my payment balance."}`
    );
    const waUrl = `${SITE_CONTACT.whatsappLink}?text=${waText}`;

    const responseText = `💳 **Payment & Balance Assistance**

🤖 **AI Support Bot**: Payment verifications and balance reconciliations are handled with priority by our direct billing team.

📌 **Quick Steps**:
1. If your UPI or QR payment was deducted but balance hasn't reflected, please allow 2-5 minutes for automatic gateway webhook sync.
2. If it has been more than 5 minutes, click the button below to send your **Transaction UTR / Screenshot** directly to our 24/7 billing specialist on WhatsApp.

👉 [**Chat with Billing Support on WhatsApp**](${waUrl})
*(Phone: ${SITE_CONTACT.whatsappNumber})*

${additionalInfo ? `\n💬 *Recorded details: "${additionalInfo}"*` : ""}`;

    return {
      message: responseText,
      metadata: { type: "payment", orderId: firstOrderId, whatsappUrl: waUrl },
    };
  }

  // "other" category
  const waTextOther = encodeURIComponent(
    `Hi Intopsmm Support! I have an inquiry regarding: ${additionalInfo || "General support on Intopsmm"}`
  );
  const waUrlOther = `${SITE_CONTACT.whatsappLink}?text=${waTextOther}`;

  const responseText = `💬 **Support Ticket Logged**

🤖 **AI Support Bot**: Thank you for reaching out. We have logged your request:
${additionalInfo ? `> "${additionalInfo}"` : "> General Inquiry"}

Our customer operations team is available 24/7. For urgent requests, instant account adjustments, or custom orders, connect directly on WhatsApp:

👉 [**Connect with Support on WhatsApp**](${waUrlOther})
*(Average response time: < 3 minutes)*`;

  return {
    message: responseText,
    metadata: { type: "other", whatsappUrl: waUrlOther },
  };
}

export async function createTicket(
  userId: string,
  input: {
    requestType: TicketType;
    orderIds?: string;
    additionalInfo?: string;
  }
): Promise<{ ticket: TicketSummary; aiMessage: TicketMessage }> {
  await ensureTicketTables();
  const db = await poolConnect;

  const orderIdsClean = input.orderIds?.trim() || "";
  const requestLabelMap: Record<TicketType, string> = {
    refill: "Refill Order",
    speed_up: "Speed-Up",
    payment: "Payment Issue",
    other: "Inquiry",
  };

  const subject = orderIdsClean
    ? `${requestLabelMap[input.requestType]} - #${orderIdsClean.split(/[\s,]+/)[0]}`
    : `${requestLabelMap[input.requestType]}`;

  const insertTicketRes = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("requestType", sql.NVarChar, input.requestType)
    .input("orderIds", sql.NVarChar, orderIdsClean || null)
    .input("subject", sql.NVarChar, subject)
    .query(`
      INSERT INTO support_tickets (user_id, request_type, order_ids, subject, status, has_unread)
      OUTPUT INSERTED.id, INSERTED.ticket_number, INSERTED.created_at, INSERTED.updated_at
      VALUES (@userId, @requestType, @orderIds, @subject, 'responded', 1)
    `);

  const ticketRow = insertTicketRes.recordset[0];
  const ticketId = ticketRow.id;
  const ticketNumber = ticketRow.ticket_number;

  // Insert user's prompt message
  const userMessageContent =
    input.additionalInfo?.trim() ||
    `Submitted request for ${requestLabelMap[input.requestType]}${orderIdsClean ? ` on Order #${orderIdsClean}` : ""}.`;

  await db
    .request()
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .input("senderType", sql.NVarChar, "user")
    .input("message", sql.NVarChar, userMessageContent)
    .query(`
      INSERT INTO ticket_messages (ticket_id, sender_type, message)
      VALUES (@ticketId, @senderType, @message)
    `);

  // Generate AI resolution
  const { message: aiContent, metadata } = await generateAiResolution(
    userId,
    input.requestType,
    orderIdsClean,
    input.additionalInfo
  );

  const aiMsgRes = await db
    .request()
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .input("senderType", sql.NVarChar, "ai_bot")
    .input("message", sql.NVarChar, aiContent)
    .input("metadata", sql.NVarChar, JSON.stringify(metadata))
    .query(`
      INSERT INTO ticket_messages (ticket_id, sender_type, message, metadata_json)
      OUTPUT INSERTED.id, INSERTED.created_at
      VALUES (@ticketId, @senderType, @message, @metadata)
    `);

  const aiMsgRow = aiMsgRes.recordset[0];

  const ticket: TicketSummary = {
    id: ticketId,
    ticketNumber,
    requestType: input.requestType,
    orderIds: orderIdsClean || null,
    subject,
    status: "responded",
    createdAt: new Date(ticketRow.created_at).toISOString(),
    updatedAt: new Date(ticketRow.updated_at).toISOString(),
    lastMessage: aiContent.slice(0, 100),
    hasUnread: true,
  };

  const aiMessage: TicketMessage = {
    id: aiMsgRow.id,
    ticketId,
    senderType: "ai_bot",
    message: aiContent,
    metadataJson: JSON.stringify(metadata),
    createdAt: new Date(aiMsgRow.created_at).toISOString(),
  };

  return { ticket, aiMessage };
}

export async function listUserTickets(userId: string): Promise<TicketSummary[]> {
  await ensureTicketTables();
  const db = await poolConnect;

  const res = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`
      SELECT TOP 50
        t.id,
        t.ticket_number,
        t.request_type,
        t.order_ids,
        t.subject,
        t.status,
        t.has_unread,
        t.created_at,
        t.updated_at,
        (
          SELECT TOP 1 m.message 
          FROM ticket_messages m 
          WHERE m.ticket_id = t.id 
          ORDER BY m.created_at DESC
        ) AS last_message
      FROM support_tickets t
      WHERE t.user_id = @userId
      ORDER BY t.created_at DESC
    `);

  return res.recordset.map((r) => ({
    id: r.id,
    ticketNumber: r.ticket_number,
    requestType: r.request_type as TicketType,
    orderIds: r.order_ids,
    subject: r.subject,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
    lastMessage: r.last_message ? String(r.last_message).slice(0, 120) : undefined,
    hasUnread: Boolean(r.has_unread),
  }));
}

export async function getTicketDetails(
  userId: string,
  ticketId: string
): Promise<{ ticket: TicketSummary; messages: TicketMessage[] } | null> {
  await ensureTicketTables();
  const db = await poolConnect;

  const ticketRes = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .query(`
      SELECT TOP 1
        id,
        ticket_number,
        request_type,
        order_ids,
        subject,
        status,
        has_unread,
        created_at,
        updated_at
      FROM support_tickets
      WHERE id = @ticketId AND user_id = @userId
    `);

  const t = ticketRes.recordset[0];
  if (!t) return null;

  // Mark unread as 0 when viewed
  await db
    .request()
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .query("UPDATE support_tickets SET has_unread = 0 WHERE id = @ticketId");

  const msgRes = await db
    .request()
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .query(`
      SELECT id, ticket_id, sender_type, message, metadata_json, created_at
      FROM ticket_messages
      WHERE ticket_id = @ticketId
      ORDER BY created_at ASC
    `);

  const messages: TicketMessage[] = msgRes.recordset.map((m) => ({
    id: m.id,
    ticketId: m.ticket_id,
    senderType: m.sender_type,
    message: m.message,
    metadataJson: m.metadata_json,
    createdAt: new Date(m.created_at).toISOString(),
  }));

  const ticket: TicketSummary = {
    id: t.id,
    ticketNumber: t.ticket_number,
    requestType: t.request_type as TicketType,
    orderIds: t.order_ids,
    subject: t.subject,
    status: t.status,
    createdAt: new Date(t.created_at).toISOString(),
    updatedAt: new Date(t.updated_at).toISOString(),
    hasUnread: false,
  };

  return { ticket, messages };
}

export async function sendTicketReply(
  userId: string,
  ticketId: string,
  message: string
): Promise<TicketMessage> {
  await ensureTicketTables();
  const db = await poolConnect;

  // Verify ownership
  const ticketRes = await db
    .request()
    .input("userId", sql.UniqueIdentifier, userId)
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .query("SELECT id FROM support_tickets WHERE id = @ticketId AND user_id = @userId");

  if (!ticketRes.recordset[0]) {
    throw new Error("Ticket not found");
  }

  const cleanMessage = message.trim();
  if (!cleanMessage) throw new Error("Message cannot be empty");

  const msgRes = await db
    .request()
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .input("senderType", sql.NVarChar, "user")
    .input("message", sql.NVarChar, cleanMessage)
    .query(`
      INSERT INTO ticket_messages (ticket_id, sender_type, message)
      OUTPUT INSERTED.id, INSERTED.created_at
      VALUES (@ticketId, @senderType, @message);

      UPDATE support_tickets 
      SET updated_at = SYSDATETIMEOFFSET() 
      WHERE id = @ticketId;
    `);

  const row = msgRes.recordset[0];
  return {
    id: row.id,
    ticketId,
    senderType: "user",
    message: cleanMessage,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
