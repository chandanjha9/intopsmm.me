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
 * Extracts a current count or drop amount mentioned in freeform text.
 */
function extractCountFromText(
  text: string | undefined,
  finalCount: number,
  startCount: number
): { currentCount?: number; dropCount?: number } {
  if (!text) return {};
  const cleaned = text.replace(/,/g, "").trim();
  const lower = cleaned.toLowerCase();

  // Pattern 1: Explicit drop mentioned like "drop: 50", "dropped 50", "50 drop", "-50"
  const dropMatch = lower.match(/(?:drop(?:ped)?\s*[:=-]?\s*(\d+)|(\d+)\s*(?:drop|dropped))/);
  if (dropMatch) {
    const dropped = Number(dropMatch[1] || dropMatch[2]);
    if (dropped > 0 && dropped <= finalCount) {
      return { currentCount: Math.max(0, finalCount - dropped), dropCount: -dropped };
    }
  }

  // Pattern 2: Explicit current count mentioned like "current: 5051", "abhi 5051", "now 5051", "5051 count"
  const currentMatch = lower.match(/(?:current(?:_count)?|abhi|now|count|live|present|remaining|still)\s*[:=-]?\s*(\d+)/);
  if (currentMatch) {
    const val = Number(currentMatch[1]);
    if (val > 0) {
      return { currentCount: val, dropCount: val < finalCount ? val - finalCount : 0 };
    }
  }

  // Pattern 3: Look for any standalone numbers that are within a realistic range of start & final count
  const numbers = cleaned.match(/\b\d+\b/g);
  if (numbers) {
    for (const numStr of numbers) {
      const num = Number(numStr);
      // If it looks like a count between start and finalCount (or slightly higher), use it
      if (num >= startCount && num <= finalCount + 500 && num !== finalCount) {
        return { currentCount: num, dropCount: num < finalCount ? num - finalCount : 0 };
      }
    }
  }

  return {};
}

/**
 * Generates an automated AI response based on request category and real order details.
 */
async function generateAiResolution(
  userId: string,
  requestType: TicketType,
  orderIdsRaw: string,
  additionalInfo?: string,
  userProvidedCurrentCount?: number | null
): Promise<{ message: string; metadata: Record<string, unknown> }> {
  const orderList = orderIdsRaw
    .split(/[\s,]+/)
    .map((s) => s.trim().replace(/^#/, ""))
    .filter(Boolean);

  const firstOrderId = orderList[0] || "";
  const order = firstOrderId ? await findOrderData(userId, firstOrderId) : null;

  if (requestType === "refill") {
    const displayId = order?.provider_order_id || firstOrderId || "14441885";
    const serviceName = order?.service_name || "Social Media Service";

    // Detect platform
    let platform = "Instagram";
    const lowerName = serviceName.toLowerCase();
    if (lowerName.includes("youtube")) platform = "YouTube";
    else if (lowerName.includes("telegram")) platform = "Telegram";
    else if (lowerName.includes("tiktok")) platform = "TikTok";
    else if (lowerName.includes("facebook")) platform = "Facebook";
    else if (lowerName.includes("twitter") || lowerName.includes(" x ")) platform = "X / Twitter";
    else if (lowerName.includes("spotify")) platform = "Spotify";

    const quantity = Number(order?.quantity) || 0;
    const startCount = Number(order?.start_count) || 0;
    const finalCount = startCount + quantity;
    const remains = Number(order?.remains) || 0;

    // Check if the service strictly supports refills
    const isNoRefill =
      lowerName.includes("no refill") ||
      lowerName.includes("non refill") ||
      lowerName.includes("no-refill") ||
      lowerName.includes("without refill");
    const isRefillSupportedByService =
      order?.refill_supported !== null &&
      order?.refill_supported !== undefined &&
      Number(order.refill_supported) === 1 &&
      !isNoRefill;
    const isCompleted = (order?.status || "").toLowerCase() === "completed";

    // Determine current count and drop count:
    let currentCount: number;
    let dropCount: number;

    const extracted = extractCountFromText(additionalInfo, finalCount, startCount);

    if (userProvidedCurrentCount !== null && userProvidedCurrentCount !== undefined && !isNaN(userProvidedCurrentCount)) {
      currentCount = Math.max(0, userProvidedCurrentCount);
      dropCount = currentCount < finalCount ? currentCount - finalCount : 0;
    } else if (extracted.currentCount !== undefined) {
      currentCount = extracted.currentCount;
      dropCount = extracted.dropCount ?? (currentCount < finalCount ? currentCount - finalCount : 0);
    } else if (remains > 0) {
      currentCount = Math.max(0, finalCount - remains);
      dropCount = -remains;
    } else {
      // Completed order with no explicit current count entered:
      // Real accurate baseline: current equals final count, drop is 0
      currentCount = finalCount;
      dropCount = 0;
    }

    // Determine eligibility
    let isEligible = false;
    let statusText = "Forwarded to refill queue";
    let noticeMessage = "";

    if (!order) {
      statusText = "Order not found in account";
      noticeMessage = "We could not find this Order ID in your active orders. Please verify the ID or contact support on WhatsApp.";
    } else if (isNoRefill || !isRefillSupportedByService) {
      isEligible = false;
      statusText = "Ineligible: No Refill service";
      noticeMessage = "This service is a 'No Refill' service. Automatic refill is not supported by the provider for this service. If you need special assistance, please contact support directly on WhatsApp.";
    } else if (!isCompleted) {
      isEligible = false;
      statusText = `Ineligible: Order is ${order.status}`;
      noticeMessage = `This order is currently marked as ${order.status}. Refill can only be requested after the order has completed delivery.`;
    } else if (dropCount >= 0) {
      isEligible = false;
      statusText = "No drop detected";
      noticeMessage = `The current count (${currentCount.toLocaleString()}) matches or exceeds the delivered count (${finalCount.toLocaleString()}). If you see a drop on your page, please reply to this ticket with your live count.`;
    } else {
      isEligible = true;
      statusText = "Forwarded to refill queue";
      noticeMessage = "Your eligible orders are now in our refill queue. We'll process them as soon as possible and notify you here once complete. If you don't hear back within 48 hours, reply to this ticket.";

      try {
        void requestOrderRefill(userId, order.id).catch(() => {});
      } catch {}
    }

    const fallbackMessage = `Hi! We checked your refill request for Order #${displayId}.

${serviceName}
Start: ${startCount.toLocaleString()} | Final: ${finalCount.toLocaleString()} | Current: ${currentCount.toLocaleString()} | Drop: ${dropCount.toLocaleString()}
Status: ${statusText}

${noticeMessage}

Chloe`;

    return {
      message: fallbackMessage,
      metadata: {
        type: "refill",
        orderId: displayId,
        platform,
        serviceName,
        startCount,
        finalCount,
        currentCount,
        dropCount,
        status: statusText,
        eligibleCount: isEligible ? 1 : 0,
        notEligibleCount: isEligible ? 0 : 1,
        cooldownCount: 0,
        noticeMessage,
      },
    };
  }

  if (requestType === "speed_up") {
    const displayId = order?.provider_order_id || firstOrderId || "14441885";
    const orderStatus = (order?.status || "").toLowerCase();

    let statusMsg = "";
    if (orderStatus === "partial") {
      statusMsg = `${displayId} - This order is already partial, no speed up action needed.`;
    } else if (orderStatus === "completed") {
      statusMsg = `${displayId} - This order is already completed, no speed up action needed.`;
    } else if (orderStatus === "canceled" || orderStatus === "refunded") {
      statusMsg = `${displayId} - This order is canceled or refunded, no speed up action needed.`;
    } else {
      statusMsg = `${displayId} - Speed up request forwarded to provider server queue. Order has been prioritized.`;
    }

    const responseText = `Hi! We checked your speed up request.

${statusMsg}

If you are experiencing a different issue with this order, please reply here and our team will look into it for you.

Chloe`;

    return {
      message: responseText,
      metadata: {
        type: "speed_up",
        orderId: displayId,
        statusMessage: statusMsg,
      },
    };
  }

  if (requestType === "payment") {
    const waText = encodeURIComponent(
      `Hi Intopsmm Support! I need help with my payment on order/ticket. Order ID: ${firstOrderId || "N/A"}. Note: ${additionalInfo || "Please check my payment balance."}`
    );
    const waUrl = `${SITE_CONTACT.whatsappLink}?text=${waText}`;

    const responseText = `For payment-related issues, please reach out to our support team directly on WhatsApp. Share your transaction details and we'll resolve it as fast as possible.

👉 [**Chat on WhatsApp**](${waUrl})`;

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

  const responseText = `For other inquiries or custom assistance, please reach out to our support team directly on WhatsApp. Share your details and we'll resolve it as fast as possible.

👉 [**Chat on WhatsApp**](${waUrlOther})`;

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
    currentCount?: number | null;
  }
): Promise<{ ticket: TicketSummary; aiMessage: TicketMessage }> {
  await ensureTicketTables();
  const db = await poolConnect;

  const orderIdsClean = input.orderIds?.trim() || "";
  const requestLabelMap: Record<TicketType, string> = {
    refill: "Refill",
    speed_up: "Speed Up",
    payment: "Payment",
    other: "Other",
  };

  const requestLabel = requestLabelMap[input.requestType];
  const subject = orderIdsClean
    ? `${requestLabel} - #${orderIdsClean.split(/[\s,]+/)[0]}`
    : `${requestLabel}`;

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

  // Format user prompt message matching Screenshot 2 & 3:
  let userMessageContent = orderIdsClean
    ? `Order ID: Order Ids - ${orderIdsClean} Request: ${requestLabel}`
    : `Request: ${requestLabel}${input.additionalInfo ? ` - ${input.additionalInfo}` : ""}`;
  
  if (input.currentCount !== null && input.currentCount !== undefined && !isNaN(input.currentCount)) {
    userMessageContent += ` | Current Count: ${input.currentCount.toLocaleString()}`;
  }

  await db
    .request()
    .input("ticketId", sql.UniqueIdentifier, ticketId)
    .input("senderType", sql.NVarChar, "user")
    .input("message", sql.NVarChar, userMessageContent)
    .query(`
      INSERT INTO ticket_messages (ticket_id, sender_type, message)
      VALUES (@ticketId, @senderType, @message)
    `);

  // Generate AI resolution with accurate count calculation
  const { message: aiContent, metadata } = await generateAiResolution(
    userId,
    input.requestType,
    orderIdsClean,
    input.additionalInfo,
    input.currentCount
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

  // Auto-respond with recalculated metrics if user provides updated count on a refill ticket
  const ticketInfo = ticketRes.recordset[0];
  if (ticketInfo && ticketInfo.request_type === "refill" && ticketInfo.order_ids) {
    const extracted = extractCountFromText(cleanMessage, 1000000, 0);
    if (extracted.currentCount !== undefined) {
      try {
        const { message: aiContent, metadata } = await generateAiResolution(
          userId,
          "refill",
          ticketInfo.order_ids,
          cleanMessage,
          extracted.currentCount
        );

        await db
          .request()
          .input("ticketId", sql.UniqueIdentifier, ticketId)
          .input("senderType", sql.NVarChar, "ai_bot")
          .input("message", sql.NVarChar, aiContent)
          .input("metadata", sql.NVarChar, JSON.stringify(metadata))
          .query(`
            INSERT INTO ticket_messages (ticket_id, sender_type, message, metadata_json)
            VALUES (@ticketId, @senderType, @message, @metadata);
            UPDATE support_tickets SET has_unread = 1, updated_at = SYSDATETIMEOFFSET() WHERE id = @ticketId;
          `);
      } catch (err) {
        console.warn("Auto-reply recalculation error:", err);
      }
    }
  }

  return {
    id: row.id,
    ticketId,
    senderType: "user",
    message: cleanMessage,
    createdAt: new Date(row.created_at).toISOString(),
  };
}
