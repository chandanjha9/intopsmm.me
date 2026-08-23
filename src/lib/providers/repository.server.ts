import { decryptSecret } from "./crypto.server";
import { ElectroSmmProvider } from "./electrosmm.server";
import type { HttpLogEntry } from "./http-client.server";
import type { SmmProvider } from "./types";
import { poolConnect } from "@/integrations/sqlServer/client";
import sql from "mssql";

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
  const db = await poolConnect;
  return db;
}

export async function insertProviderLog(providerId: string | null, entry: HttpLogEntry): Promise<void> {
  const db = await admin();
  const query = `INSERT INTO provider_logs (provider_id, action, request_payload, response_payload, status_code, duration_ms, retry_count, error_message)
                 VALUES (@providerId, @action, @request, @response, @statusCode, @durationMs, @retryCount, @errorMessage)`;
  await db.request()
    .input('providerId', sql.NVarChar, providerId)
    .input('action', sql.NVarChar, entry.action)
    .input('request', sql.NVarChar, JSON.stringify(entry.request))
    .input('response', sql.NVarChar, entry.response ? JSON.stringify(entry.response) : null)
    .input('statusCode', sql.Int, entry.statusCode)
    .input('durationMs', sql.Int, entry.durationMs)
    .input('retryCount', sql.Int, entry.retryCount)
    .input('errorMessage', sql.NVarChar, entry.error ?? null)
    .query(query);
}

export async function notifyAdmins(input: {
  kind: string;
  title: string;
  message?: string;
  severity?: "info" | "warning" | "critical";
}): Promise<void> {
  const db = await admin();
  const query = `INSERT INTO admin_notifications (kind, title, message, severity)
                 VALUES (@kind, @title, @message, @severity)`;
  await db.request()
    .input('kind', sql.NVarChar, input.kind)
    .input('title', sql.NVarChar, input.title)
    .input('message', sql.NVarChar, input.message ?? null)
    .input('severity', sql.NVarChar, input.severity ?? "warning")
    .query(query);
}

export async function getProviderRow(providerId: string): Promise<ProviderRow> {
  const db = await admin();
  const query = `SELECT * FROM providers WHERE id = @id`;
  const result = await db.request()
    .input('id', sql.NVarChar, providerId)
    .query(query);
  const row = result.recordset[0];
  if (!row) throw new Error("Provider not found");
  return row as ProviderRow;
}

/** Highest-priority active provider, used when an order does not pin one. */
export async function getPrimaryProviderRow(): Promise<ProviderRow> {
  const db = await admin();
  const query = `SELECT TOP 1 * FROM providers WHERE is_active = 1 ORDER BY priority ASC`;
  const result = await db.request().query(query);
  const row = result.recordset[0];
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
  const query = `UPDATE providers SET last_error = @error, last_checked_at = @checkedAt WHERE id = @id`;
  await db.request()
    .input('id', sql.NVarChar, providerId)
    .input('error', sql.NVarChar, error)
    .input('checkedAt', sql.NVarChar, new Date().toISOString())
    .query(query);
  if (error) {
    await notifyAdmins({
      kind: "provider_offline",
      title: "Provider request failed",
      message: error,
      severity: "critical",
    });
  }
}
