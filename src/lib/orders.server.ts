import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { getProviderClient, markProviderHealth } from "./providers/repository.server";
import { sendTelegramLowBalanceAlert } from "./telegram.server";

export type CreateOrderResult = {
  orderId: string;
  status: string;
  charge: number;
  isQueued?: boolean;
};

/**
 * Creates the local order (wallet debited atomically in SQL Server Stored Procedure),
 * then forwards it to the provider. If provider lacks funds, the order is safely queued
 * for admin and an instant Telegram notification is dispatched.
 */
export async function createAndForwardOrder(input: {
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
}): Promise<CreateOrderResult> {
  const db = await poolConnect;

  // 1. Atomically debit wallet and create initial order
  let orderId: string;
  try {
    const spResult = await db
      .request()
      .input("userId", sql.UniqueIdentifier, input.userId)
      .input("serviceId", sql.UniqueIdentifier, input.serviceId)
      .input("link", sql.NVarChar, input.link)
      .input("quantity", sql.Int, input.quantity)
      .output("orderId", sql.UniqueIdentifier)
      .execute("sp_create_order_with_debit");

    orderId = spResult.output.orderId;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    throw new Error(message.replace(/^.*?Error:\s*/i, ""));
  }

  if (!orderId) throw new Error("Order could not be created");

  // 2. Fetch service provider details & user email
  const [serviceResult, orderResult, userResult] = await Promise.all([
    db
      .request()
      .input("serviceId", sql.UniqueIdentifier, input.serviceId)
      .query("SELECT name, provider_id, provider_service_id FROM services WHERE id = @serviceId"),
    db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .query("SELECT charge FROM orders WHERE id = @orderId"),
    db
      .request()
      .input("userId", sql.UniqueIdentifier, input.userId)
      .query("SELECT email FROM users WHERE id = @userId"),
  ]);

  const service = serviceResult.recordset[0];
  const charge = Number(orderResult.recordset[0]?.charge ?? 0);
  const userEmail = userResult.recordset[0]?.email ?? "customer";

  if (!service?.provider_service_id) {
    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("reason", sql.NVarChar, "Service is not linked to a provider")
      .execute("sp_refund_order");
    throw new Error("This service is temporarily unavailable");
  }

  const requestPayload = {
    service: service.provider_service_id,
    link: input.link,
    quantity: input.quantity,
  };

  try {
    const { row, client } = await getProviderClient(service.provider_id);
    const response = await client.createOrder(requestPayload);
    await markProviderHealth(row.id, null);

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("providerId", sql.UniqueIdentifier, row.id)
      .input("providerOrderId", sql.NVarChar, String(response.order))
      .input("requestPayload", sql.NVarChar, JSON.stringify(requestPayload))
      .input("responsePayload", sql.NVarChar, JSON.stringify(response))
      .input("status", sql.NVarChar, "sent")
      .query(`
        INSERT INTO provider_orders (order_id, provider_id, provider_order_id, request_payload, response_payload, status)
        VALUES (@orderId, @providerId, @providerOrderId, @requestPayload, @responsePayload, @status)
      `);

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("status", sql.NVarChar, "in_progress")
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query("UPDATE orders SET status = @status, updated_at = @updatedAt WHERE id = @orderId");

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("fromStatus", sql.NVarChar, "pending")
      .input("toStatus", sql.NVarChar, "in_progress")
      .input("note", sql.NVarChar, "Forwarded to provider")
      .query(`
        INSERT INTO order_status_history (order_id, from_status, to_status, note)
        VALUES (@orderId, @fromStatus, @toStatus, @note)
      `);

    return { orderId, status: "in_progress", charge };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider error";
    const lower = message.toLowerCase();

    const isLowBalanceOrTemporary =
      lower.includes("not enough funds") ||
      lower.includes("balance") ||
      lower.includes("fund") ||
      lower.includes("insufficient") ||
      lower.includes("timed out") ||
      lower.includes("network") ||
      lower.includes("temporarily");

    if (isLowBalanceOrTemporary) {
      // Safely hold in Admin Queue without failing or refunding the customer
      await db
        .request()
        .input("orderId", sql.UniqueIdentifier, orderId)
        .input("providerId", sql.UniqueIdentifier, service.provider_id)
        .input("requestPayload", sql.NVarChar, JSON.stringify(requestPayload))
        .input("responsePayload", sql.NVarChar, JSON.stringify({ error: message, queued: true }))
        .input("status", sql.NVarChar, "queued")
        .query(`
          INSERT INTO provider_orders (order_id, provider_id, request_payload, response_payload, status)
          VALUES (@orderId, @providerId, @requestPayload, @responsePayload, @status)
        `);

      await db
        .request()
        .input("orderId", sql.UniqueIdentifier, orderId)
        .input("status", sql.NVarChar, "pending")
        .input("errorMessage", sql.NVarChar, "Held in Admin Queue (Provider balance low)")
        .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
        .query("UPDATE orders SET status = @status, error_message = @errorMessage, updated_at = @updatedAt WHERE id = @orderId");

      await db
        .request()
        .input("orderId", sql.UniqueIdentifier, orderId)
        .input("fromStatus", sql.NVarChar, "pending")
        .input("toStatus", sql.NVarChar, "pending")
        .input("note", sql.NVarChar, `Queued for admin: ${message}`)
        .query(`
          INSERT INTO order_status_history (order_id, from_status, to_status, note)
          VALUES (@orderId, @fromStatus, @toStatus, @note)
        `);

      // Dispatch Telegram Alert to Admin
      void sendTelegramLowBalanceAlert({
        orderId,
        userEmail,
        serviceName: service.name,
        quantity: input.quantity,
        charge,
        link: input.link,
        reason: message,
      });

      return { orderId, status: "pending", charge, isQueued: true };
    }

    // Fatal error -> refund
    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("providerId", sql.UniqueIdentifier, service.provider_id)
      .input("requestPayload", sql.NVarChar, JSON.stringify(requestPayload))
      .input("responsePayload", sql.NVarChar, JSON.stringify({ error: message }))
      .input("status", sql.NVarChar, "failed")
      .query(`
        INSERT INTO provider_orders (order_id, provider_id, request_payload, response_payload, status)
        VALUES (@orderId, @providerId, @requestPayload, @responsePayload, @status)
      `);

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("status", sql.NVarChar, "failed")
      .input("errorMessage", sql.NVarChar, message)
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query("UPDATE orders SET status = @status, error_message = @errorMessage, updated_at = @updatedAt WHERE id = @orderId");

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("reason", sql.NVarChar, "Order could not be placed, amount refunded")
      .execute("sp_refund_order");

    throw new Error("We could not place this order right now. Your wallet has been refunded.");
  }
}

/**
 * Manually forwards a queued order to the provider after admin adds funds.
 */
export async function processSingleQueuedOrder(orderId: string): Promise<{
  success: boolean;
  message: string;
  providerOrderId?: string;
}> {
  const db = await poolConnect;

  const orderRes = await db
    .request()
    .input("orderId", sql.UniqueIdentifier, orderId)
    .query(`
      SELECT o.id, o.service_id, o.link, o.quantity, o.status, o.charge, 
             s.provider_id, s.provider_service_id, s.name as service_name, u.email as user_email
      FROM orders o
      INNER JOIN services s ON o.service_id = s.id
      INNER JOIN users u ON o.user_id = u.id
      WHERE o.id = @orderId
    `);

  const order = orderRes.recordset[0];
  if (!order) {
    return { success: false, message: "Order not found" };
  }

  if (order.status !== "pending" && order.status !== "failed") {
    return { success: false, message: `Order is already in '${order.status}' status.` };
  }

  const requestPayload = {
    service: order.provider_service_id,
    link: order.link,
    quantity: order.quantity,
  };

  try {
    const { row, client } = await getProviderClient(order.provider_id);
    const response = await client.createOrder(requestPayload);
    await markProviderHealth(row.id, null);

    const providerOrderId = String(response.order);

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("providerId", sql.UniqueIdentifier, row.id)
      .input("providerOrderId", sql.NVarChar, providerOrderId)
      .input("requestPayload", sql.NVarChar, JSON.stringify(requestPayload))
      .input("responsePayload", sql.NVarChar, JSON.stringify(response))
      .input("status", sql.NVarChar, "sent")
      .query(`
        MERGE provider_orders AS target
        USING (SELECT @orderId AS order_id) AS source
        ON (target.order_id = source.order_id)
        WHEN MATCHED THEN
          UPDATE SET provider_order_id = @providerOrderId, request_payload = @requestPayload, 
                     response_payload = @responsePayload, status = @status, updated_at = SYSDATETIMEOFFSET()
        WHEN NOT MATCHED THEN
          INSERT (order_id, provider_id, provider_order_id, request_payload, response_payload, status)
          VALUES (@orderId, @providerId, @providerOrderId, @requestPayload, @responsePayload, @status);
      `);

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("status", sql.NVarChar, "in_progress")
      .query("UPDATE orders SET status = @status, error_message = NULL, updated_at = SYSDATETIMEOFFSET() WHERE id = @orderId");

    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("fromStatus", sql.NVarChar, order.status)
      .input("toStatus", sql.NVarChar, "in_progress")
      .input("note", sql.NVarChar, "Processed from Admin Queue")
      .query(`
        INSERT INTO order_status_history (order_id, from_status, to_status, note)
        VALUES (@orderId, @fromStatus, @toStatus, @note)
      `);

    return {
      success: true,
      message: `Order forwarded to provider (Provider Order #${providerOrderId})`,
      providerOrderId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider error";
    return { success: false, message };
  }
}

/**
 * Bulk forwards all queued orders to the provider.
 */
export async function processAllQueuedOrders(): Promise<{
  total: number;
  processed: number;
  failed: number;
  results: Array<{ orderId: string; success: boolean; message: string }>;
}> {
  const db = await poolConnect;
  const result = await db.request().query(`
    SELECT o.id 
    FROM orders o
    WHERE o.status = 'pending' 
      AND (
        o.error_message LIKE '%queued%' 
        OR o.error_message LIKE '%balance%'
        OR EXISTS (SELECT 1 FROM provider_orders po WHERE po.order_id = o.id AND po.status = 'queued')
      )
    ORDER BY o.created_at ASC
  `);

  const queuedOrders = result.recordset;
  let processed = 0;
  let failed = 0;
  const results: Array<{ orderId: string; success: boolean; message: string }> = [];

  for (const row of queuedOrders) {
    const res = await processSingleQueuedOrder(row.id);
    if (res.success) {
      processed++;
    } else {
      failed++;
    }
    results.push({ orderId: row.id, ...res });
  }

  return { total: queuedOrders.length, processed, failed, results };
}


export async function requestOrderRefill(userId: string, orderId: string): Promise<{ refillId: string }> {
  const db = await poolConnect;

  const result = await db
    .request()
    .input("orderId", sql.UniqueIdentifier, orderId)
    .query(`
      SELECT o.id, o.user_id, o.status, po.provider_order_id, po.provider_id
      FROM orders o
      LEFT JOIN provider_orders po ON o.id = po.order_id
      WHERE o.id = @orderId
    `);

  const order = result.recordset[0];
  if (!order || order.user_id !== userId) throw new Error("Order not found");
  if (order.status !== "completed") throw new Error("Only completed orders can be refilled");
  if (!order.provider_order_id) throw new Error("This order cannot be refilled");

  const insertResult = await db
    .request()
    .input("orderId", sql.UniqueIdentifier, orderId)
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`
      INSERT INTO refill_requests (order_id, user_id)
      OUTPUT INSERTED.id
      VALUES (@orderId, @userId)
    `);

  const requestId = insertResult.recordset[0]?.id;

  try {
    const { client } = await getProviderClient(order.provider_id);
    const response = await client.createRefill(order.provider_order_id);

    await db
      .request()
      .input("id", sql.UniqueIdentifier, requestId)
      .input("refillId", sql.NVarChar, String(response.refill))
      .input("status", sql.NVarChar, "requested")
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE refill_requests 
        SET provider_refill_id = @refillId, status = @status, updated_at = @updatedAt 
        WHERE id = @id
      `);

    return { refillId: requestId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refill request failed";
    await db
      .request()
      .input("id", sql.UniqueIdentifier, requestId)
      .input("status", sql.NVarChar, "failed")
      .input("errorMessage", sql.NVarChar, message)
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE refill_requests 
        SET status = @status, error_message = @errorMessage, updated_at = @updatedAt 
        WHERE id = @id
      `);
    throw new Error("Refill could not be requested for this order.");
  }
}

export async function requestOrderCancel(userId: string, orderId: string): Promise<{ cancelled: boolean }> {
  const db = await poolConnect;

  const result = await db
    .request()
    .input("orderId", sql.UniqueIdentifier, orderId)
    .query(`
      SELECT o.id, o.user_id, o.status, po.provider_order_id, po.provider_id
      FROM orders o
      LEFT JOIN provider_orders po ON o.id = po.order_id
      WHERE o.id = @orderId
    `);

  const order = result.recordset[0];
  if (!order || order.user_id !== userId) throw new Error("Order not found");
  if (!["pending", "in_progress", "processing"].includes(order.status)) {
    throw new Error("This order can no longer be cancelled");
  }

  const insertResult = await db
    .request()
    .input("orderId", sql.UniqueIdentifier, orderId)
    .input("userId", sql.UniqueIdentifier, userId)
    .query(`
      INSERT INTO cancel_requests (order_id, user_id)
      OUTPUT INSERTED.id
      VALUES (@orderId, @userId)
    `);

  const requestId = insertResult.recordset[0]?.id;

  if (!order.provider_order_id) {
    await db
      .request()
      .input("orderId", sql.UniqueIdentifier, orderId)
      .input("reason", sql.NVarChar, "Order cancelled before dispatch")
      .execute("sp_refund_order");

    await db
      .request()
      .input("id", sql.UniqueIdentifier, requestId)
      .input("status", sql.NVarChar, "completed")
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query("UPDATE cancel_requests SET status = @status, updated_at = @updatedAt WHERE id = @id");

    return { cancelled: true };
  }

  try {
    const { client } = await getProviderClient(order.provider_id);
    await client.cancelOrders([order.provider_order_id]);

    await db
      .request()
      .input("id", sql.UniqueIdentifier, requestId)
      .input("status", sql.NVarChar, "requested")
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query("UPDATE cancel_requests SET status = @status, updated_at = @updatedAt WHERE id = @id");

    return { cancelled: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancellation failed";
    await db
      .request()
      .input("id", sql.UniqueIdentifier, requestId)
      .input("status", sql.NVarChar, "failed")
      .input("errorMessage", sql.NVarChar, message)
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE cancel_requests 
        SET status = @status, error_message = @errorMessage, updated_at = @updatedAt 
        WHERE id = @id
      `);
    throw new Error("Cancellation could not be submitted for this order.");
  }
}
