import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { getProviderClient, markProviderHealth } from "./providers/repository.server";

export type CreateOrderResult = {
  orderId: string;
  status: string;
  charge: number;
};

/**
 * Creates the local order (wallet debited atomically in SQL Server Stored Procedure),
 * then forwards it to the provider. Provider failures refund the customer automatically.
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

  // 2. Fetch service provider details
  const serviceResult = await db
    .request()
    .input("serviceId", sql.UniqueIdentifier, input.serviceId)
    .query("SELECT provider_id, provider_service_id FROM services WHERE id = @serviceId");

  const service = serviceResult.recordset[0];

  const orderResult = await db
    .request()
    .input("orderId", sql.UniqueIdentifier, orderId)
    .query("SELECT charge FROM orders WHERE id = @orderId");

  const charge = Number(orderResult.recordset[0]?.charge ?? 0);

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
    const message = error instanceof Error ? error.message : "Provider rejected the order";

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
