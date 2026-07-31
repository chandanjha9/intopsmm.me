import { decryptSecret } from "./crypto.server";
import { ElectroSmmProvider } from "./electrosmm.server";
import type { HttpLogEntry } from "./http-client.server";
import type { SmmProvider } from "./types";

type ProviderRow = {
  id: string;
  name: string;
  api_url: string;
  api_key_encrypted: string;
  timeout_ms: number;
  currency: string;
  is_active: boolean;
  priority: number;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function insertProviderLog(providerId: string | null, entry: HttpLogEntry): Promise<void> {
  const db = await admin();
  await db.from("provider_logs").insert({
    provider_id: providerId,
    action: entry.action,
    request_payload: entry.request as never,
    response_payload: (entry.response ?? null) as never,
    status_code: entry.statusCode,
    duration_ms: entry.durationMs,
    retry_count: entry.retryCount,
    error_message: entry.error,
  });
}

export async function notifyAdmins(input: {
  kind: string;
  title: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
}): Promise<void> {
  const db = await admin();
  await db.from("admin_notifications").insert({
    kind: input.kind,
    title: input.title,
    message: input.message ?? null,
    severity: input.severity ?? "warning",
  });
}

export async function getProviderRow(providerId: string): Promise<ProviderRow> {
  const db = await admin();
  const { data, error } = await db.from("providers").select("*").eq("id", providerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Provider not found");
  return data as ProviderRow;
}

/** Highest-priority active provider, used when an order does not pin one. */
export async function getPrimaryProviderRow(): Promise<ProviderRow> {
  const db = await admin();
  const { data, error } = await db
    .from("providers")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) throw new Error("No active provider is configured");
  return row as ProviderRow;
}

export async function buildProvider(row: ProviderRow): Promise<SmmProvider> {
  // Prefer the encrypted key stored on the provider row; fall back to the
  // ELECTROSMM_API_KEY secret so a provider can be set up without pasting a key.
  const apiKey = row.api_key_encrypted
    ? await decryptSecret(row.api_key_encrypted)
    : (process.env.ELECTROSMM_API_KEY ?? "");
  if (!apiKey) throw new Error("No API key is configured for this provider");
  return new ElectroSmmProvider({
    apiUrl: row.api_url,
    apiKey,
    timeoutMs: row.timeout_ms,
    onLog: (entry) => insertProviderLog(row.id, entry),
  });
}


export async function getProviderClient(providerId?: string | null): Promise<{
  row: ProviderRow;
  client: SmmProvider;
}> {
  const row = providerId ? await getProviderRow(providerId) : await getPrimaryProviderRow();
  return { row, client: await buildProvider(row) };
}

export async function markProviderHealth(providerId: string, error: string | null): Promise<void> {
  const db = await admin();
  await db
    .from("providers")
    .update({ last_error: error, last_checked_at: new Date().toISOString() })
    .eq("id", providerId);
  if (error) {
    await notifyAdmins({
      kind: "provider_offline",
      title: "Provider request failed",
      message: error,
      severity: "critical",
    });
  }
}
