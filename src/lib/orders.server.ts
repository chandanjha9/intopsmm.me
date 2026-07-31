import { getProviderClient, markProviderHealth } from "./providers/repository.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type CreateOrderResult = {
  orderId: string;
  status: string;
  charge: number;
};

/**
 * Creates the local order (wallet debited atomically in SQL), then forwards it
 * to the provider. Provider failures refund the customer automatically.
 */
export async function createAndForwardOrder(input: {
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
}): Promise<CreateOrderResult> {
  const db = await admin();

  const { data: orderId, error: rpcError } = await db.rpc("create_order_with_debit", {
    _user_id: input.userId,
    _service_id: input.serviceId,
    _link: input.link,
    _quantity: input.quantity,
  });
  if (rpcError) throw new Error(rpcError.message.replace(/^.*?ERROR:\s*/i, ""));
  if (!orderId) throw new Error("Order could not be created");

  const { data: service } = await db
    .from("services")
    .select("provider_id, provider_service_id")
    .eq("id", input.serviceId)
    .maybeSingle();

  const { data: order } = await db.from("orders").select("charge").eq("id", orderId).maybeSingle();
  const charge = Number(order?.charge ?? 0);

  if (!service?.provider_service_id) {
    await db.rpc("refund_order", { _order_id: orderId, _reason: "Service is not linked to a provider" });
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

    await db.from("provider_orders").insert({
      order_id: orderId,
      provider_id: row.id,
      provider_order_id: String(response.order),
      request_payload: requestPayload as never,
      response_payload: response as never,
      status: "sent",
    });
    await db.from("orders").update({ status: "in_progress" }).eq("id", orderId);
    await db.from("order_status_history").insert({
      order_id: orderId,
      from_status: "pending",
      to_status: "in_progress",
      note: "Forwarded to provider",
    });

    return { orderId, status: "in_progress", charge };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider rejected the order";
    await db.from("provider_orders").insert({
      order_id: orderId,
      provider_id: service.provider_id,
      request_payload: requestPayload as never,
      response_payload: { error: message } as never,
      status: "failed",
    });
    await db.from("orders").update({ status: "failed", error_message: message }).eq("id", orderId);
    await db.rpc("refund_order", { _order_id: orderId, _reason: "Order could not be placed, amount refunded" });
    throw new Error("We could not place this order right now. Your wallet has been refunded.");
  }
}

export async function requestOrderRefill(userId: string, orderId: string): Promise<{ refillId: string }> {
  const db = await admin();
  const { data: order } = await db
    .from("orders")
    .select("id, user_id, status, provider_orders(provider_order_id, provider_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== userId) throw new Error("Order not found");
  if (order.status !== "completed") throw new Error("Only completed orders can be refilled");

  const link = Array.isArray(order.provider_orders) ? order.provider_orders[0] : order.provider_orders;
  if (!link?.provider_order_id) throw new Error("This order cannot be refilled");

  const { data: request, error } = await db
    .from("refill_requests")
    .insert({ order_id: orderId, user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  try {
    const { client } = await getProviderClient(link.provider_id);
    const response = await client.createRefill(link.provider_order_id);
    await db
      .from("refill_requests")
      .update({ provider_refill_id: String(response.refill), status: "requested" })
      .eq("id", request.id);
    return { refillId: request.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Refill request failed";
    await db.from("refill_requests").update({ status: "failed", error_message: message }).eq("id", request.id);
    throw new Error("Refill could not be requested for this order.");
  }
}

export async function requestOrderCancel(userId: string, orderId: string): Promise<{ cancelled: boolean }> {
  const db = await admin();
  const { data: order } = await db
    .from("orders")
    .select("id, user_id, status, provider_orders(provider_order_id, provider_id)")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.user_id !== userId) throw new Error("Order not found");
  if (!["pending", "in_progress", "processing"].includes(order.status)) {
    throw new Error("This order can no longer be cancelled");
  }

  const link = Array.isArray(order.provider_orders) ? order.provider_orders[0] : order.provider_orders;
  const { data: request, error } = await db
    .from("cancel_requests")
    .insert({ order_id: orderId, user_id: userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (!link?.provider_order_id) {
    await db.rpc("refund_order", { _order_id: orderId, _reason: "Order cancelled before dispatch" });
    await db.from("cancel_requests").update({ status: "completed" }).eq("id", request.id);
    return { cancelled: true };
  }

  try {
    const { client } = await getProviderClient(link.provider_id);
    await client.cancelOrders([link.provider_order_id]);
    await db.from("cancel_requests").update({ status: "requested" }).eq("id", request.id);
    return { cancelled: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cancellation failed";
    await db.from("cancel_requests").update({ status: "failed", error_message: message }).eq("id", request.id);
    throw new Error("Cancellation could not be submitted for this order.");
  }
}
