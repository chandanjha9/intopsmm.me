import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { calculateSellingRate } from "./pricing";
import { getProviderClient, markProviderHealth, notifyAdmins } from "./repository.server";
import { ACTIVE_ORDER_STATUSES, normaliseStatus, type RemoteOrderStatus } from "./types";

const BATCH_SIZE = 100;
const LOW_BALANCE_THRESHOLD = 10;

type ProviderServiceCatalogItem = {
  provider_service_id: string;
  rate: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean;
  cancel_supported: boolean;
  is_available: boolean;
};

export async function logCronRun(
  jobName: string,
  status: "success" | "error",
  details: Record<string, unknown>,
  durationMs: number,
): Promise<void> {
  const db = await poolConnect;
  await db
    .request()
    .input("jobName", sql.NVarChar, jobName)
    .input("status", sql.NVarChar, status)
    .input("details", sql.NVarChar, JSON.stringify(details))
    .input("durationMs", sql.Int, durationMs)
    .query(`
      INSERT INTO cron_logs (job_name, status, details, duration_ms)
      VALUES (@jobName, @status, @details, @durationMs)
    `);

  if (status === "error") {
    await notifyAdmins({
      kind: "cron_failure",
      title: `Scheduled job failed: ${jobName}`,
      message: JSON.stringify(details).slice(0, 500),
      severity: "critical",
    });
  }
}

/** Imports/updates the provider catalog in SQL Server. Missing services are disabled, never duplicated. */
export async function importProviderServices(providerId?: string | null): Promise<{
  providerId: string;
  imported: number;
  updated: number;
  disabled: number;
}> {
  const db = await poolConnect;
  const { row, client } = await getProviderClient(providerId);

  try {
    const remote = await client.getServices();
    await markProviderHealth(row.id, null);

    const existingRes = await db
      .request()
      .input("providerId", sql.UniqueIdentifier, row.id)
      .query("SELECT provider_service_id FROM provider_services WHERE provider_id = @providerId");

    const existingIds = new Set(existingRes.recordset.map((item: { provider_service_id: string }) => item.provider_service_id));
    const now = new Date().toISOString();

    let imported = 0;
    let updated = 0;

    for (const service of remote) {
      const pServiceId = String(service.service);
      const isNew = !existingIds.has(pServiceId);

      const request = db.request()
        .input("providerId", sql.UniqueIdentifier, row.id)
        .input("providerServiceId", sql.NVarChar, pServiceId)
        .input("name", sql.NVarChar, service.name || "")
        .input("category", sql.NVarChar, service.category || "")
        .input("type", sql.NVarChar, service.type || "Default")
        .input("rate", sql.Decimal(18, 4), Number(service.rate) || 0)
        .input("minQuantity", sql.Int, Number(service.min) || 1)
        .input("maxQuantity", sql.Int, Number(service.max) || 1000000)
        .input("refillSupported", sql.Bit, Boolean(service.refill))
        .input("cancelSupported", sql.Bit, Boolean(service.cancel))
        .input("isAvailable", sql.Bit, true)
        .input("lastImportedAt", sql.DateTimeOffset, now)
        .input("updatedAt", sql.DateTimeOffset, now);

      await request.query(`
        MERGE provider_services AS target
        USING (SELECT @providerId AS provider_id, @providerServiceId AS provider_service_id) AS source
        ON (target.provider_id = source.provider_id AND target.provider_service_id = source.provider_service_id)
        WHEN MATCHED THEN
          UPDATE SET 
            name = @name, category = @category, type = @type, rate = @rate, 
            min_quantity = @minQuantity, max_quantity = @maxQuantity, 
            refill_supported = @refillSupported, cancel_supported = @cancelSupported, 
            is_available = @isAvailable, last_imported_at = @lastImportedAt, updated_at = @updatedAt
        WHEN NOT MATCHED THEN
          INSERT (
            provider_id, provider_service_id, name, category, type, rate, 
            min_quantity, max_quantity, refill_supported, cancel_supported, 
            is_available, last_imported_at
          )
          VALUES (
            @providerId, @providerServiceId, @name, @category, @type, @rate, 
            @minQuantity, @maxQuantity, @refillSupported, @cancelSupported, 
            @isAvailable, @lastImportedAt
          );
      `);

      if (isNew) imported += 1;
      else updated += 1;
    }

    const remoteIds = new Set(remote.map((item: { service: string | number }) => String(item.service)));
    const missing = [...existingIds].filter((id) => !remoteIds.has(id));

    if (missing.length > 0) {
      for (const missingId of missing) {
        await db
          .request()
          .input("providerId", sql.UniqueIdentifier, row.id)
          .input("missingId", sql.NVarChar, missingId)
          .query(`
            UPDATE provider_services 
            SET is_available = 0, updated_at = SYSDATETIMEOFFSET() 
            WHERE provider_id = @providerId AND provider_service_id = @missingId
          `);
      }
    }

    await resyncInternalPricing(row.id);

    return { providerId: row.id, imported, updated, disabled: missing.length };
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

/** Recomputes selling prices + limits for internal services of one provider in SQL Server. */
export async function resyncInternalPricing(providerId: string): Promise<number> {
  const db = await poolConnect;

  const servicesRes = await db
    .request()
    .input("providerId", sql.UniqueIdentifier, providerId)
    .query("SELECT id, provider_service_id, markup_type, markup_value FROM services WHERE provider_id = @providerId");

  const services = servicesRes.recordset;
  if (!services?.length) return 0;

  const catalogRes = await db
    .request()
    .input("providerId", sql.UniqueIdentifier, providerId)
    .query(`
      SELECT provider_service_id, rate, min_quantity, max_quantity, refill_supported, cancel_supported, is_available
      FROM provider_services
      WHERE provider_id = @providerId
    `);

  const byId = new Map<string, ProviderServiceCatalogItem>(
    catalogRes.recordset.map((item: ProviderServiceCatalogItem) => [item.provider_service_id, item]),
  );

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
      .request()
      .input("id", sql.UniqueIdentifier, service.id)
      .input("sellingRate", sql.Decimal(18, 4), sellingRate)
      .input("minQuantity", sql.Int, source.min_quantity)
      .input("maxQuantity", sql.Int, source.max_quantity)
      .input("refillSupported", sql.Bit, source.refill_supported)
      .input("cancelSupported", sql.Bit, source.cancel_supported)
      .input("isActive", sql.Bit, source.is_available)
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE services 
        SET selling_rate = @sellingRate, min_quantity = @minQuantity, max_quantity = @maxQuantity, 
            refill_supported = @refillSupported, cancel_supported = @cancelSupported, 
            is_active = @isActive, updated_at = @updatedAt
        WHERE id = @id
      `);

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

/** Bulk status synchronisation for all active orders in SQL Server, batched 100 per request. */
export async function syncOrderStatuses(): Promise<{ checked: number; updated: number }> {
  const db = await poolConnect;

  const result = await db.request().query(`
    SELECT TOP 1000
      o.id, o.status, po.provider_order_id, po.provider_id
    FROM orders o
    LEFT JOIN provider_orders po ON o.id = po.order_id
    WHERE o.status IN ('pending', 'in_progress', 'processing')
    ORDER BY o.created_at ASC
  `);

  const entries = result.recordset
    .map((row: { id: string; status: string; provider_order_id?: string | null; provider_id?: string | null }) =>
      row.provider_order_id
        ? {
            orderId: row.id,
            currentStatus: row.status,
            providerOrderId: row.provider_order_id,
            providerId: row.provider_id ?? null,
          }
        : null,
    )
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
      const response = await client.getMultipleOrderStatus(batch.map((item: { providerOrderId: string }) => item.providerOrderId));

      for (const entry of batch) {
        const parsed = extractStatus(response?.[entry.providerOrderId]);
        if (!parsed) continue;

        if (parsed.status === entry.currentStatus) {
          await db
            .request()
            .input("id", sql.UniqueIdentifier, entry.orderId)
            .input("lastSyncedAt", sql.DateTimeOffset, new Date().toISOString())
            .query("UPDATE orders SET last_synced_at = @lastSyncedAt WHERE id = @id");
          continue;
        }

        await db
          .request()
          .input("id", sql.UniqueIdentifier, entry.orderId)
          .input("status", sql.NVarChar, parsed.status)
          .input("startCount", sql.Int, parsed.startCount)
          .input("remains", sql.Int, parsed.remains)
          .input("lastSyncedAt", sql.DateTimeOffset, new Date().toISOString())
          .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
          .query(`
            UPDATE orders 
            SET status = @status, start_count = @startCount, remains = @remains, 
                last_synced_at = @lastSyncedAt, updated_at = @updatedAt 
            WHERE id = @id
          `);

        await db
          .request()
          .input("orderId", sql.UniqueIdentifier, entry.orderId)
          .input("fromStatus", sql.NVarChar, entry.currentStatus)
          .input("toStatus", sql.NVarChar, parsed.status)
          .input("note", sql.NVarChar, "Provider status sync")
          .query(`
            INSERT INTO order_status_history (order_id, from_status, to_status, note)
            VALUES (@orderId, @fromStatus, @toStatus, @note)
          `);

        if (parsed.status === "canceled") {
          await db
            .request()
            .input("orderId", sql.UniqueIdentifier, entry.orderId)
            .input("reason", sql.NVarChar, "Order canceled by provider")
            .execute("sp_refund_order");
        }

        updated += 1;
      }
    }
  }

  return { checked: entries.length, updated };
}

export async function syncProviderBalances(): Promise<{ providers: number }> {
  const db = await poolConnect;
  const providersRes = await db.request().query("SELECT id FROM providers WHERE is_active = 1");
  const providers = providersRes.recordset;

  let count = 0;
  for (const provider of providers) {
    try {
      const { client } = await getProviderClient(provider.id);
      const balance = await client.getBalance();
      const value = Number(balance.balance) || 0;

      await db
        .request()
        .input("id", sql.UniqueIdentifier, provider.id)
        .input("lastBalance", sql.Decimal(18, 4), value)
        .input("lastBalanceAt", sql.DateTimeOffset, new Date().toISOString())
        .input("currency", sql.NVarChar, balance.currency)
        .input("lastCheckedAt", sql.DateTimeOffset, new Date().toISOString())
        .query(`
          UPDATE providers 
          SET last_balance = @lastBalance, last_balance_at = @lastBalanceAt, 
              currency = @currency, last_error = NULL, last_checked_at = @lastCheckedAt 
          WHERE id = @id
        `);

      await db
        .request()
        .input("providerId", sql.UniqueIdentifier, provider.id)
        .input("balance", sql.Decimal(18, 4), value)
        .input("currency", sql.NVarChar, balance.currency)
        .query(`
          INSERT INTO provider_balance_logs (provider_id, balance, currency)
          VALUES (@providerId, @balance, @currency)
        `);

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
  const db = await poolConnect;

  const result = await db.request().query(`
    SELECT TOP 50
      id, order_id, provider_id, retry_count, request_payload
    FROM provider_orders
    WHERE status = 'failed' AND retry_count < 3
  `);

  let retried = 0;
  let refunded = 0;

  for (const failure of result.recordset) {
    let payload: { service?: string; link?: string; quantity?: number } = {};
    try {
      payload = typeof failure.request_payload === "string" ? JSON.parse(failure.request_payload) : failure.request_payload || {};
    } catch {
      continue;
    }

    if (!payload.service || !payload.link || !payload.quantity) continue;

    try {
      const { client } = await getProviderClient(failure.provider_id);
      const response = await client.createOrder({
        service: payload.service,
        link: payload.link,
        quantity: payload.quantity,
      });

      await db
        .request()
        .input("id", sql.UniqueIdentifier, failure.id)
        .input("providerOrderId", sql.NVarChar, String(response.order))
        .input("responsePayload", sql.NVarChar, JSON.stringify(response))
        .input("status", sql.NVarChar, "sent")
        .input("retryCount", sql.Int, failure.retry_count + 1)
        .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
        .query(`
          UPDATE provider_orders 
          SET provider_order_id = @providerOrderId, response_payload = @responsePayload, 
              status = @status, retry_count = @retryCount, updated_at = @updatedAt 
          WHERE id = @id
        `);

      await db
        .request()
        .input("orderId", sql.UniqueIdentifier, failure.order_id)
        .input("status", sql.NVarChar, "in_progress")
        .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
        .query("UPDATE orders SET status = @status, error_message = NULL, updated_at = @updatedAt WHERE id = @orderId");

      retried += 1;
    } catch (error) {
      const nextCount = failure.retry_count + 1;
      await db
        .request()
        .input("id", sql.UniqueIdentifier, failure.id)
        .input("retryCount", sql.Int, nextCount)
        .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
        .query("UPDATE provider_orders SET retry_count = @retryCount, updated_at = @updatedAt WHERE id = @id");

      if (nextCount >= 3) {
        await db
          .request()
          .input("orderId", sql.UniqueIdentifier, failure.order_id)
          .input("reason", sql.NVarChar, "Provider could not accept the order")
          .execute("sp_refund_order");

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
  const db = await poolConnect;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  await db
    .request()
    .input("cutoff", sql.DateTimeOffset, cutoff)
    .query(`
      DELETE FROM provider_logs WHERE created_at < @cutoff;
      DELETE FROM cron_logs WHERE created_at < @cutoff;
      DELETE FROM provider_balance_logs WHERE created_at < @cutoff;
    `);

  return { deleted: true };
}
