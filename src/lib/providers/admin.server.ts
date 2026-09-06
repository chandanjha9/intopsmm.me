import sql from "mssql";
import { poolConnect } from "@/integrations/sqlServer/client";
import { encryptSecret } from "./crypto.server";
import { buildProvider, getProviderRow, markProviderHealth } from "./repository.server";
import { calculateSellingRate } from "./pricing";
import type { MarkupType, ProviderSummary } from "./types";

export async function fetchProviders(): Promise<ProviderSummary[]> {
  const db = await poolConnect;
  const result = await db.request().query(`
    SELECT 
      id, name, api_url, priority, is_active, timeout_ms, currency, 
      last_balance, last_balance_at, last_error, last_checked_at, 
      api_key_encrypted, created_at, updated_at
    FROM providers
    ORDER BY priority ASC
  `);

  return result.recordset.map((row) => {
    const { api_key_encrypted, ...rest } = row;
    return {
      ...rest,
      last_balance: row.last_balance !== null ? Number(row.last_balance) : null,
      is_active: Boolean(row.is_active),
      has_api_key: Boolean(api_key_encrypted),
    } as ProviderSummary;
  });
}

export async function saveProvider(input: {
  id?: string;
  name: string;
  apiUrl: string;
  apiKey?: string;
  priority: number;
  isActive: boolean;
  timeoutMs: number;
  currency: string;
}): Promise<{ id: string }> {
  const db = await poolConnect;

  if (input.id) {
    if (input.apiKey) {
      const encrypted = await encryptSecret(input.apiKey);
      await db
        .request()
        .input("id", sql.UniqueIdentifier, input.id)
        .input("name", sql.NVarChar, input.name)
        .input("apiUrl", sql.NVarChar, input.apiUrl)
        .input("apiKeyEncrypted", sql.NVarChar, encrypted)
        .input("priority", sql.Int, input.priority)
        .input("isActive", sql.Bit, input.isActive)
        .input("timeoutMs", sql.Int, input.timeoutMs)
        .input("currency", sql.NVarChar, input.currency)
        .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
        .query(`
          UPDATE providers 
          SET name = @name, api_url = @apiUrl, api_key_encrypted = @apiKeyEncrypted, 
              priority = @priority, is_active = @isActive, timeout_ms = @timeoutMs, 
              currency = @currency, updated_at = @updatedAt
          WHERE id = @id
        `);
    } else {
      await db
        .request()
        .input("id", sql.UniqueIdentifier, input.id)
        .input("name", sql.NVarChar, input.name)
        .input("apiUrl", sql.NVarChar, input.apiUrl)
        .input("priority", sql.Int, input.priority)
        .input("isActive", sql.Bit, input.isActive)
        .input("timeoutMs", sql.Int, input.timeoutMs)
        .input("currency", sql.NVarChar, input.currency)
        .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
        .query(`
          UPDATE providers 
          SET name = @name, api_url = @apiUrl, priority = @priority, 
              is_active = @isActive, timeout_ms = @timeoutMs, 
              currency = @currency, updated_at = @updatedAt
          WHERE id = @id
        `);
    }
    return { id: input.id };
  }

  if (!input.apiKey) throw new Error("An API key is required for a new provider");
  const encrypted = await encryptSecret(input.apiKey);

  const result = await db
    .request()
    .input("name", sql.NVarChar, input.name)
    .input("apiUrl", sql.NVarChar, input.apiUrl)
    .input("apiKeyEncrypted", sql.NVarChar, encrypted)
    .input("priority", sql.Int, input.priority)
    .input("isActive", sql.Bit, input.isActive)
    .input("timeoutMs", sql.Int, input.timeoutMs)
    .input("currency", sql.NVarChar, input.currency)
    .query(`
      INSERT INTO providers (name, api_url, api_key_encrypted, priority, is_active, timeout_ms, currency)
      OUTPUT INSERTED.id
      VALUES (@name, @apiUrl, @apiKeyEncrypted, @priority, @isActive, @timeoutMs, @currency)
    `);

  return { id: result.recordset[0].id };
}

export async function removeProvider(id: string): Promise<void> {
  const db = await poolConnect;
  await db
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query("DELETE FROM providers WHERE id = @id");
}

export async function testProviderConnection(
  id: string,
): Promise<{ ok: boolean; balance?: number; currency?: string; message?: string }> {
  try {
    const row = await getProviderRow(id);
    const client = await buildProvider(row);
    const balance = await client.getBalance();
    await markProviderHealth(id, null);

    const db = await poolConnect;
    const balNum = Number(balance.balance) || 0;

    await db
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .input("lastBalance", sql.Decimal(18, 4), balNum)
      .input("lastBalanceAt", sql.DateTimeOffset, new Date().toISOString())
      .input("currency", sql.NVarChar, balance.currency)
      .query(`
        UPDATE providers 
        SET last_balance = @lastBalance, last_balance_at = @lastBalanceAt, currency = @currency 
        WHERE id = @id
      `);

    return { ok: true, balance: balNum, currency: balance.currency };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection failed";
    await markProviderHealth(id, message);
    return { ok: false, message };
  }
}

export async function fetchProviderCatalog(input: { providerId?: string; search?: string; limit: number }) {
  const db = await poolConnect;
  const request = db.request();

  let query = `
    SELECT TOP (@limit)
      id, provider_id, provider_service_id, name, category, type, rate, 
      min_quantity, max_quantity, refill_supported, cancel_supported, is_available
    FROM provider_services
    WHERE 1 = 1
  `;

  request.input("limit", sql.Int, input.limit || 100);

  if (input.providerId) {
    query += " AND provider_id = @providerId";
    request.input("providerId", sql.UniqueIdentifier, input.providerId);
  }

  if (input.search) {
    query += " AND name LIKE @search";
    request.input("search", sql.NVarChar, `%${input.search}%`);
  }

  query += " ORDER BY category ASC, name ASC";

  const result = await request.query(query);
  return result.recordset.map((row) => ({
    ...row,
    rate: Number(row.rate),
    refill_supported: Boolean(row.refill_supported),
    cancel_supported: Boolean(row.cancel_supported),
    is_available: Boolean(row.is_available),
  }));
}

export async function fetchInternalServices() {
  const db = await poolConnect;
  const result = await db.request().query(`
    SELECT 
      id, provider_id, provider_service_id, name, category, platform, 
      markup_type, markup_value, selling_rate, min_quantity, max_quantity, 
      refill_supported, cancel_supported, is_active
    FROM services
    ORDER BY category ASC, name ASC
  `);

  return result.recordset.map((row) => ({
    ...row,
    markup_value: Number(row.markup_value),
    selling_rate: Number(row.selling_rate),
    refill_supported: Boolean(row.refill_supported),
    cancel_supported: Boolean(row.cancel_supported),
    is_active: Boolean(row.is_active),
  }));
}

export async function saveInternalService(input: {
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
}): Promise<{ id: string; sellingRate: number }> {
  const db = await poolConnect;

  const sourceResult = await db
    .request()
    .input("providerId", sql.UniqueIdentifier, input.providerId)
    .input("providerServiceId", sql.NVarChar, input.providerServiceId)
    .query(`
      SELECT rate, min_quantity, max_quantity, refill_supported, cancel_supported
      FROM provider_services
      WHERE provider_id = @providerId AND provider_service_id = @providerServiceId
    `);

  const source = sourceResult.recordset[0];
  if (!source) throw new Error("Provider service not found — import the catalog first");

  const sellingRate = calculateSellingRate(Number(source.rate), input.markupType, input.markupValue);

  if (input.id) {
    await db
      .request()
      .input("id", sql.UniqueIdentifier, input.id)
      .input("providerId", sql.UniqueIdentifier, input.providerId)
      .input("providerServiceId", sql.NVarChar, input.providerServiceId)
      .input("name", sql.NVarChar, input.name)
      .input("category", sql.NVarChar, input.category)
      .input("platform", sql.NVarChar, input.platform)
      .input("description", sql.NVarChar, input.description ?? null)
      .input("markupType", sql.NVarChar, input.markupType)
      .input("markupValue", sql.Decimal(18, 4), input.markupValue)
      .input("sellingRate", sql.Decimal(18, 4), sellingRate)
      .input("minQuantity", sql.Int, source.min_quantity)
      .input("maxQuantity", sql.Int, source.max_quantity)
      .input("refillSupported", sql.Bit, source.refill_supported)
      .input("cancelSupported", sql.Bit, source.cancel_supported)
      .input("isActive", sql.Bit, input.isActive)
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE services 
        SET provider_id = @providerId, provider_service_id = @providerServiceId, name = @name, 
            category = @category, platform = @platform, description = @description, 
            markup_type = @markupType, markup_value = @markupValue, selling_rate = @sellingRate, 
            min_quantity = @minQuantity, max_quantity = @maxQuantity, 
            refill_supported = @refillSupported, cancel_supported = @cancelSupported, 
            is_active = @isActive, updated_at = @updatedAt
        WHERE id = @id
      `);
    return { id: input.id, sellingRate };
  }

  // Duplicate Check 1: Check if this provider service is already published
  const existingProviderService = await db
    .request()
    .input("providerId", sql.UniqueIdentifier, input.providerId)
    .input("providerServiceId", sql.NVarChar, input.providerServiceId)
    .query(`SELECT TOP 1 id FROM services WHERE provider_id = @providerId AND provider_service_id = @providerServiceId`);

  if (existingProviderService.recordset.length > 0) {
    const existingId = String(existingProviderService.recordset[0].id);
    await db
      .request()
      .input("id", sql.UniqueIdentifier, existingId)
      .input("name", sql.NVarChar, input.name)
      .input("category", sql.NVarChar, input.category)
      .input("platform", sql.NVarChar, input.platform)
      .input("description", sql.NVarChar, input.description ?? null)
      .input("markupType", sql.NVarChar, input.markupType)
      .input("markupValue", sql.Decimal(18, 4), input.markupValue)
      .input("sellingRate", sql.Decimal(18, 4), sellingRate)
      .input("minQuantity", sql.Int, source.min_quantity)
      .input("maxQuantity", sql.Int, source.max_quantity)
      .input("refillSupported", sql.Bit, source.refill_supported)
      .input("cancelSupported", sql.Bit, source.cancel_supported)
      .input("isActive", sql.Bit, input.isActive)
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE services 
        SET name = @name, category = @category, platform = @platform, description = @description, 
            markup_type = @markupType, markup_value = @markupValue, selling_rate = @sellingRate, 
            min_quantity = @minQuantity, max_quantity = @maxQuantity, 
            refill_supported = @refillSupported, cancel_supported = @cancelSupported, 
            is_active = @isActive, updated_at = @updatedAt
        WHERE id = @id
      `);
    return { id: existingId, sellingRate };
  }

  // Duplicate Check 2: Check by exact Name + Category
  const existingByName = await db
    .request()
    .input("name", sql.NVarChar, input.name.trim())
    .input("category", sql.NVarChar, input.category.trim())
    .query(`SELECT TOP 1 id FROM services WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(@name) AND LOWER(LTRIM(RTRIM(category))) = LOWER(@category)`);

  if (existingByName.recordset.length > 0) {
    const existingId = String(existingByName.recordset[0].id);
    await db
      .request()
      .input("id", sql.UniqueIdentifier, existingId)
      .input("providerId", sql.UniqueIdentifier, input.providerId)
      .input("providerServiceId", sql.NVarChar, input.providerServiceId)
      .input("sellingRate", sql.Decimal(18, 4), sellingRate)
      .input("minQuantity", sql.Int, source.min_quantity)
      .input("maxQuantity", sql.Int, source.max_quantity)
      .input("refillSupported", sql.Bit, source.refill_supported)
      .input("cancelSupported", sql.Bit, source.cancel_supported)
      .input("isActive", sql.Bit, input.isActive)
      .input("updatedAt", sql.DateTimeOffset, new Date().toISOString())
      .query(`
        UPDATE services 
        SET provider_id = @providerId, provider_service_id = @providerServiceId, 
            selling_rate = @sellingRate, min_quantity = @minQuantity, max_quantity = @maxQuantity, 
            refill_supported = @refillSupported, cancel_supported = @cancelSupported, 
            is_active = @isActive, updated_at = @updatedAt
        WHERE id = @id
      `);
    return { id: existingId, sellingRate };
  }

  // Insert Brand New Service
  const insertResult = await db
    .request()
    .input("providerId", sql.UniqueIdentifier, input.providerId)
    .input("providerServiceId", sql.NVarChar, input.providerServiceId)
    .input("name", sql.NVarChar, input.name)
    .input("category", sql.NVarChar, input.category)
    .input("platform", sql.NVarChar, input.platform)
    .input("description", sql.NVarChar, input.description ?? null)
    .input("markupType", sql.NVarChar, input.markupType)
    .input("markupValue", sql.Decimal(18, 4), input.markupValue)
    .input("sellingRate", sql.Decimal(18, 4), sellingRate)
    .input("minQuantity", sql.Int, source.min_quantity)
    .input("maxQuantity", sql.Int, source.max_quantity)
    .input("refillSupported", sql.Bit, source.refill_supported)
    .input("cancelSupported", sql.Bit, source.cancel_supported)
    .input("isActive", sql.Bit, input.isActive)
    .query(`
      INSERT INTO services (
        provider_id, provider_service_id, name, category, platform, description, 
        markup_type, markup_value, selling_rate, min_quantity, max_quantity, 
        refill_supported, cancel_supported, is_active
      )
      OUTPUT INSERTED.id
      VALUES (
        @providerId, @providerServiceId, @name, @category, @platform, @description, 
        @markupType, @markupValue, @sellingRate, @minQuantity, @maxQuantity, 
        @refillSupported, @cancelSupported, @isActive
      )
    `);

  const newServiceId = String(insertResult.recordset[0].id);

  // Automatically broadcast new service announcement to user feed
  try {
    await db
      .request()
      .input("title", sql.NVarChar(255), `✨ New Service Added: ${input.name}`)
      .input(
        "description",
        sql.NVarChar(sql.MAX),
        `New service "${input.name}" has been launched in ${input.category} starting at ₹${sellingRate.toFixed(2)} / 1000 with instant automated delivery.`
      )
      .input("category", sql.NVarChar(100), input.category)
      .input("post_type", sql.NVarChar(50), "news")
      .input("badge", sql.NVarChar(100), "✨ New Service")
      .input("is_popup", sql.Bit, 0)
      .input("is_active", sql.Bit, 1)
      .query(`
        INSERT INTO announcements (title, description, category, post_type, badge, is_popup, is_active)
        VALUES (@title, @description, @category, @post_type, @badge, @is_popup, @is_active)
      `);
  } catch (err) {
    console.error("Failed to auto-post new service announcement:", err);
  }

  return { id: newServiceId, sellingRate };
}

/** Clean up any duplicate services in the catalog by Name + Category */
export async function cleanDuplicateServices(): Promise<{ removed: number }> {
  const db = await poolConnect;
  const result = await db.request().query(`
    WITH CTE AS (
      SELECT id,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(LTRIM(RTRIM(name))), LOWER(LTRIM(RTRIM(category)))
          ORDER BY updated_at DESC, id ASC
        ) as rn
      FROM services
    )
    DELETE FROM services
    WHERE id IN (SELECT id FROM CTE WHERE rn > 1);
  `);

  const removed = result.rowsAffected[0] || 0;
  return { removed };
}

export async function removeInternalService(id: string): Promise<void> {
  const db = await poolConnect;
  await db
    .request()
    .input("id", sql.UniqueIdentifier, id)
    .query("DELETE FROM services WHERE id = @id");
}

export async function fetchApiLogs(input: { action?: string; onlyErrors: boolean; limit: number }) {
  const db = await poolConnect;
  const request = db.request();

  let query = `
    SELECT TOP (@limit)
      id, provider_id, action, status_code, duration_ms, retry_count, 
      error_message, request_payload, response_payload, created_at
    FROM provider_logs
    WHERE 1 = 1
  `;

  request.input("limit", sql.Int, input.limit || 50);

  if (input.action) {
    query += " AND action = @action";
    request.input("action", sql.NVarChar, input.action);
  }

  if (input.onlyErrors) {
    query += " AND error_message IS NOT NULL";
  }

  query += " ORDER BY created_at DESC";

  const result = await request.query(query);
  return result.recordset;
}

export async function fetchAdminOverview() {
  const db = await poolConnect;
  const providers = await fetchProviders();

  const [catalogRes, servicesRes, ordersRes, errorsRes, cronRes, notifRes] = await Promise.all([
    db.request().query("SELECT COUNT(*) AS total FROM provider_services WHERE is_available = 1"),
    db.request().query("SELECT COUNT(*) AS total FROM services WHERE is_active = 1"),
    db.request().query("SELECT status FROM orders"),
    db.request().query(`
      SELECT COUNT(*) AS total 
      FROM provider_logs 
      WHERE error_message IS NOT NULL AND created_at >= DATEADD(DAY, -1, SYSDATETIMEOFFSET())
    `),
    db.request().query("SELECT TOP 10 job_name, status, created_at FROM cron_logs ORDER BY created_at DESC"),
    db.request().query("SELECT TOP 20 id, kind, severity, title, message, is_read, created_at FROM admin_notifications ORDER BY created_at DESC"),
  ]);

  const counts = { pending: 0, in_progress: 0, completed: 0, failed: 0, total: 0 };
  for (const row of ordersRes.recordset) {
    counts.total += 1;
    if (row.status === "completed") counts.completed += 1;
    else if (["failed", "error", "canceled", "refunded"].includes(row.status)) counts.failed += 1;
    else if (row.status === "pending") counts.pending += 1;
    else counts.in_progress += 1;
  }

  const healthy = providers.some((provider) => provider.is_active && !provider.last_error);

  return {
    providers,
    importedServices: catalogRes.recordset[0]?.total ?? 0,
    internalServices: servicesRes.recordset[0]?.total ?? 0,
    orders: counts,
    apiErrors24h: errorsRes.recordset[0]?.total ?? 0,
    cronRuns: cronRes.recordset,
    notifications: notifRes.recordset.map((n) => ({ ...n, is_read: Boolean(n.is_read) })),
    health: healthy ? "healthy" : providers.length === 0 ? "not_configured" : "degraded",
    lastSyncAt: cronRes.recordset[0]?.created_at ?? null,
  };
}
