import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { encryptSecret } from "./crypto.server";
import { buildProvider, getProviderRow, markProviderHealth } from "./repository.server";
import { calculateSellingRate } from "./pricing";
import type { MarkupType, ProviderSummary } from "./types";

type Db = SupabaseClient<Database>;

const PROVIDER_COLUMNS =
  "id, name, api_url, priority, is_active, timeout_ms, currency, last_balance, last_balance_at, last_error, last_checked_at, api_key_encrypted, created_at, updated_at";

export async function fetchProviders(db: Db): Promise<ProviderSummary[]> {
  const { data, error } = await db.from("providers").select(PROVIDER_COLUMNS).order("priority");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const { api_key_encrypted, ...rest } = row;
    return { ...rest, has_api_key: Boolean(api_key_encrypted) } as ProviderSummary;
  });
}

export async function saveProvider(
  db: Db,
  input: {
    id?: string;
    name: string;
    apiUrl: string;
    apiKey?: string;
    priority: number;
    isActive: boolean;
    timeoutMs: number;
    currency: string;
  },
): Promise<{ id: string }> {
  const base = {
    name: input.name,
    api_url: input.apiUrl,
    priority: input.priority,
    is_active: input.isActive,
    timeout_ms: input.timeoutMs,
    currency: input.currency,
  };

  if (input.id) {
    const payload = input.apiKey
      ? { ...base, api_key_encrypted: await encryptSecret(input.apiKey) }
      : base;
    const { error } = await db.from("providers").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return { id: input.id };
  }

  if (!input.apiKey) throw new Error("An API key is required for a new provider");
  const { data, error } = await db
    .from("providers")
    .insert({ ...base, api_key_encrypted: await encryptSecret(input.apiKey) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function removeProvider(db: Db, id: string): Promise<void> {
  const { error } = await db.from("providers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function testProviderConnection(
  id: string,
): Promise<{ ok: boolean; balance?: number; currency?: string; message?: string }> {
  try {
    const row = await getProviderRow(id);
    const client = await buildProvider(row);
    const balance = await client.getBalance();
    await markProviderHealth(id, null);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("providers")
      .update({
        last_balance: Number(balance.balance) || 0,
        last_balance_at: new Date().toISOString(),
        currency: balance.currency,
      })
      .eq("id", id);
    return { ok: true, balance: Number(balance.balance) || 0, currency: balance.currency };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    await markProviderHealth(id, message);
    return { ok: false, message };
  }
}

export async function fetchProviderCatalog(
  db: Db,
  input: { providerId?: string; search?: string; limit: number },
) {
  let query = db
    .from("provider_services")
    .select(
      "id, provider_id, provider_service_id, name, category, type, rate, min_quantity, max_quantity, refill_supported, cancel_supported, is_available",
    )
    .order("category")
    .limit(input.limit);
  if (input.providerId) query = query.eq("provider_id", input.providerId);
  if (input.search) query = query.ilike("name", `%${input.search}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchInternalServices(db: Db) {
  const { data, error } = await db
    .from("services")
    .select(
      "id, provider_id, provider_service_id, name, category, platform, markup_type, markup_value, selling_rate, min_quantity, max_quantity, refill_supported, cancel_supported, is_active",
    )
    .order("category")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function saveInternalService(
  db: Db,
  input: {
    id?: string;
    providerId: string;
    providerServiceId: string;
    name: string;
    category: string;
    platform: string;
    description?: string;
    markupType: MarkupType;
    markupValue: number;
    isActive: boolean;
  },
): Promise<{ id: string; sellingRate: number }> {
  const { data: source, error: sourceError } = await db
    .from("provider_services")
    .select("rate, min_quantity, max_quantity, refill_supported, cancel_supported")
    .eq("provider_id", input.providerId)
    .eq("provider_service_id", input.providerServiceId)
    .maybeSingle();
  if (sourceError) throw new Error(sourceError.message);
  if (!source) throw new Error("Provider service not found — import the catalog first");

  const sellingRate = calculateSellingRate(Number(source.rate), input.markupType, input.markupValue);
  const payload = {
    provider_id: input.providerId,
    provider_service_id: input.providerServiceId,
    name: input.name,
    category: input.category,
    platform: input.platform,
    description: input.description ?? null,
    markup_type: input.markupType,
    markup_value: input.markupValue,
    selling_rate: sellingRate,
    min_quantity: source.min_quantity,
    max_quantity: source.max_quantity,
    refill_supported: source.refill_supported,
    cancel_supported: source.cancel_supported,
    is_active: input.isActive,
  };

  if (input.id) {
    const { error } = await db.from("services").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
    return { id: input.id, sellingRate };
  }
  const { data, error } = await db.from("services").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  return { id: data.id, sellingRate };
}

export async function removeInternalService(db: Db, id: string): Promise<void> {
  const { error } = await db.from("services").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchApiLogs(db: Db, input: { action?: string; onlyErrors: boolean; limit: number }) {
  let query = db
    .from("provider_logs")
    .select("id, provider_id, action, status_code, duration_ms, retry_count, error_message, request_payload, response_payload, created_at")
    .order("created_at", { ascending: false })
    .limit(input.limit);
  if (input.action) query = query.eq("action", input.action);
  if (input.onlyErrors) query = query.not("error_message", "is", null);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function fetchAdminOverview(db: Db) {
  const [providers, catalog, services, statuses, errors, cron, notifications] = await Promise.all([
    fetchProviders(db),
    db.from("provider_services").select("id", { count: "exact", head: true }).eq("is_available", true),
    db.from("services").select("id", { count: "exact", head: true }).eq("is_active", true),
    db.from("orders").select("status"),
    db
      .from("provider_logs")
      .select("id", { count: "exact", head: true })
      .not("error_message", "is", null)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    db.from("cron_logs").select("job_name, status, created_at").order("created_at", { ascending: false }).limit(10),
    db
      .from("admin_notifications")
      .select("id, kind, severity, title, message, is_read, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const counts = { pending: 0, in_progress: 0, completed: 0, failed: 0, total: 0 };
  for (const row of statuses.data ?? []) {
    counts.total += 1;
    if (row.status === "completed") counts.completed += 1;
    else if (["failed", "error", "canceled", "refunded"].includes(row.status)) counts.failed += 1;
    else if (row.status === "pending") counts.pending += 1;
    else counts.in_progress += 1;
  }

  const healthy = providers.some((provider) => provider.is_active && !provider.last_error);

  return {
    providers,
    importedServices: catalog.count ?? 0,
    internalServices: services.count ?? 0,
    orders: counts,
    apiErrors24h: errors.count ?? 0,
    cronRuns: cron.data ?? [],
    notifications: notifications.data ?? [],
    health: healthy ? "healthy" : providers.length === 0 ? "not_configured" : "degraded",
    lastSyncAt: cron.data?.[0]?.created_at ?? null,
  };
}
