import { calculateSellingRate } from "./pricing";
import { getProviderClient, markProviderHealth, notifyAdmins } from "./repository.server";
import { ACTIVE_ORDER_STATUSES, normaliseStatus, type RemoteOrderStatus } from "./types";

const BATCH_SIZE = 100;
const LOW_BALANCE_THRESHOLD = 10;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function logCronRun(
  jobName: string,
  status: "success" | "error",
  details: Record<string, unknown>,
  durationMs: number,
): Promise<void> {
  const db = await admin();
  await db.from("cron_logs").insert({
    job_name: jobName,
    status,
    details: details as never,
    duration_ms: durationMs,
  });
  if (status === "error") {
    await notifyAdmins({
      kind: "cron_failure",
      title: `Scheduled job failed: ${jobName}`,
      message: JSON.stringify(details).slice(0, 500),
      severity: "critical",
    });
  }
}

/** Imports/updates the provider catalog. Missing services are disabled, never duplicated. */
export async function importProviderServices(providerId?: string | null): Promise<{
  providerId: string;
  imported: number;
  updated: number;
  disabled: number;
}> {
  const db = await admin();
  const { row, client } = await getProviderClient(providerId);

  try {
    const remote = await client.getServices();
    await markProviderHealth(row.id, null);

    const { data: existing } = await db
      .from("provider_services")
      .select("id, provider_service_id")
      .eq("provider_id", row.id);
    const existingIds = new Set((existing ?? []).map((item) => item.provider_service_id));

    const now = new Date().toISOString();
    const rows = remote.map((service) => ({
      provider_id: row.id,
      provider_service_id: String(service.service),
      name: service.name,
      category: service.category ?? "",
      type: service.type ?? "Default",
      rate: Number(service.rate) || 0,
      min_quantity: Number(service.min) || 1,
      max_quantity: Number(service.max) || 1000000,
      refill_supported: Boolean(service.refill),
      cancel_supported: Boolean(service.cancel),
      is_available: true,
      last_imported_at: now,
    }));

    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error } = await db
        .from("provider_services")
        .upsert(chunk, { onConflict: "provider_id,provider_service_id" });
      if (error) throw new Error(error.message);
    }

    const remoteIds = new Set(rows.map((item) => item.provider_service_id));
    const missing = [...existingIds].filter((id) => !remoteIds.has(id));
    if (missing.length > 0) {
      await db
        .from("provider_services")
        .update({ is_available: false })
        .eq("provider_id", row.id)
        .in("provider_service_id", missing);
    }

    // Keep internal services priced against the freshest provider rates.
    await resyncInternalPricing(row.id);

    const imported = rows.filter((item) => !existingIds.has(item.provider_service_id)).length;
    return { providerId: row.id, imported, updated: rows.length - imported, disabled: missing.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown import failure";
    await markProviderHealth(row.id, message);
    await notifyAdmins({
      kind: "import_failure",
      title: "Service import failed",
      message,
      severity: "critical",
    });
    throw error;
  }
}

/** Recomputes selling prices + limits for internal services of one provider. */
export async function resyncInternalPricing(providerId: string): Promise<number> {
  const db = await admin();
  const { data: services } = await db
    .from("services")
    .select("id, provider_service_id, markup_type, markup_value")
    .eq("provider_id", providerId);
  if (!services?.length) return 0;

  const { data: catalog } = await db
    .from("provider_services")
    .select("provider_service_id, rate, min_quantity, max_quantity, refill_supported, cancel_supported, is_available")
    .eq("provider_id", providerId);
  const byId = new Map((catalog ?? []).map((item) => [item.provider_service_id, item]));

  let updated = 0;
  for (const service of services) {
    const source = service.provider_service_id ? byId.get(service.provider_service_id) : undefined;
    if (!source) continue;
    const sellingRate = calculateSellingRate(
      Number(source.rate),
      service.markup_type === "fixed" ? "fixed" : "percentage",
      Number(service.markup_value),
    );
    await db
      .from("services")
      .update({
        selling_rate: sellingRate,
        min_quantity: source.min_quantity,
        max_quantity: source.max_quantity,
        refill_supported: source.refill_supported,
        cancel_supported: source.cancel_supported,
        is_active: source.is_available,
      })
      .eq("id", service.id);
    updated += 1;
  }
  return updated;
}

function extractStatus(payload: RemoteOrderStatus | undefined) {
  if (!payload || payload.error) return null;
  return {
    status: normaliseStatus(payload.status),
    startCount: Number(payload.start_count ?? 0) || 0,
    remains: Number(payload.remains ?? 0) || 0,
    charge: Number(payload.charge ?? 0) || 0,
  };
}

/** Bulk status synchronisation for all active orders, batched 100 per request. */
export async function syncOrderStatuses(): Promise<{ checked: number; updated: number }> {
  const db = await admin();
  const { data: pending } = await db
    .from("orders")
    .select("id, status, provider_orders(provider_order_id, provider_id)")
    .in("status", [...ACTIVE_ORDER_STATUSES])
    .order("created_at", { ascending: true })
    .limit(1000);

  const entries = (pending ?? [])
    .map((order) => {
      const link = Array.isArray(order.provider_orders) ? order.provider_orders[0] : order.provider_orders;
      return link?.provider_order_id
        ? {
            orderId: order.id,
            currentStatus: order.status,
            providerOrderId: link.provider_order_id,
            providerId: link.provider_id,
          }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (entries.length === 0) return { checked: 0, updated: 0 };

  const byProvider = new Map<string | null, typeof entries>();
  for (const entry of entries) {
    const list = byProvider.get(entry.providerId) ?? [];
    list.push(entry);
    byProvider.set(entry.providerId, list);
  }

  let updated = 0;
  for (const [providerId, list] of byProvider) {
    const { client } = await getProviderClient(providerId);
    for (let i = 0; i < list.length; i += BATCH_SIZE) {
      const batch = list.slice(i, i + BATCH_SIZE);
      const response = await client.getMultipleOrderStatus(batch.map((item) => item.providerOrderId));
      for (const entry of batch) {
        const parsed = extractStatus(response?.[entry.providerOrderId]);
        if (!parsed) continue;
        if (parsed.status === entry.currentStatus) {
          await db.from("orders").update({ last_synced_at: new Date().toISOString() }).eq("id", entry.orderId);
          continue;
        }
        await db
          .from("orders")
          .update({
            status: parsed.status,
            start_count: parsed.startCount,
            remains: parsed.remains,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", entry.orderId);
        await db.from("order_status_history").insert({
          order_id: entry.orderId,
          from_status: entry.currentStatus,
          to_status: parsed.status,
          note: "Provider status sync",
        });
        if (parsed.status === "canceled") {
          await db.rpc("refund_order", { _order_id: entry.orderId, _reason: "Order canceled by provider" });
        }
        updated += 1;
      }
    }
  }

  return { checked: entries.length, updated };
}

export async function syncProviderBalances(): Promise<{ providers: number }> {
  const db = await admin();
  const { data: providers } = await db.from("providers").select("id").eq("is_active", true);
  let count = 0;
  for (const provider of providers ?? []) {
    try {
      const { client } = await getProviderClient(provider.id);
      const balance = await client.getBalance();
      const value = Number(balance.balance) || 0;
      await db
        .from("providers")
        .update({
          last_balance: value,
          last_balance_at: new Date().toISOString(),
          currency: balance.currency,
          last_error: null,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", provider.id);
      await db
        .from("provider_balance_logs")
        .insert({ provider_id: provider.id, balance: value, currency: balance.currency });
      if (value < LOW_BALANCE_THRESHOLD) {
        await notifyAdmins({
          kind: "balance_low",
          title: "Provider balance is low",
          message: `Remaining balance: ${value} ${balance.currency}`,
          severity: "critical",
        });
      }
      count += 1;
    } catch (error) {
      await markProviderHealth(provider.id, error instanceof Error ? error.message : "Balance check failed");
    }
  }
  return { providers: count };
}

/** Re-forwards orders that failed to reach the provider; refunds after 3 attempts. */
export async function retryFailedOrders(): Promise<{ retried: number; refunded: number }> {
  const db = await admin();
  const { data: failures } = await db
    .from("provider_orders")
    .select("id, order_id, provider_id, retry_count, request_payload")
    .eq("status", "failed")
    .lt("retry_count", 3)
    .limit(50);

  let retried = 0;
  let refunded = 0;
  for (const failure of failures ?? []) {
    const payload = (failure.request_payload ?? {}) as { service?: string; link?: string; quantity?: number };
    if (!payload.service || !payload.link || !payload.quantity) continue;
    try {
      const { client } = await getProviderClient(failure.provider_id);
      const response = await client.createOrder({
        service: payload.service,
        link: payload.link,
        quantity: payload.quantity,
      });
      await db
        .from("provider_orders")
        .update({
          provider_order_id: String(response.order),
          response_payload: response as never,
          status: "sent",
          retry_count: failure.retry_count + 1,
        })
        .eq("id", failure.id);
      await db.from("orders").update({ status: "in_progress", error_message: null }).eq("id", failure.order_id);
      retried += 1;
    } catch (error) {
      const nextCount = failure.retry_count + 1;
      await db.from("provider_orders").update({ retry_count: nextCount }).eq("id", failure.id);
      if (nextCount >= 3) {
        await db.rpc("refund_order", {
          _order_id: failure.order_id,
          _reason: "Provider could not accept the order",
        });
        refunded += 1;
        await notifyAdmins({
          kind: "retry_failure",
          title: "Order permanently failed and was refunded",
          message: error instanceof Error ? error.message : "Unknown error",
          severity: "critical",
        });
      }
    }
  }
  return { retried, refunded };
}

export async function cleanOldLogs(days = 30): Promise<{ deleted: boolean }> {
  const db = await admin();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  await db.from("provider_logs").delete().lt("created_at", cutoff);
  await db.from("cron_logs").delete().lt("created_at", cutoff);
  await db.from("provider_balance_logs").delete().lt("created_at", cutoff);
  return { deleted: true };
}
