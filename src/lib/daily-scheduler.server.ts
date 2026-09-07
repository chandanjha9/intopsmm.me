import {
  syncProviderBalances,
  importProviderServices,
  syncOrderStatuses,
  logCronRun,
} from "@/lib/providers/sync.server";

let isDailySchedulerInitialized = false;

// 24 hours in milliseconds
const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

async function executeDailySyncSequence() {
  console.log("[scheduler] Starting daily automated provider sync sequence...");

  // 1. Sync provider balances and update admin balance
  try {
    const startBal = Date.now();
    const balRes = await syncProviderBalances();
    await logCronRun("balance-sync", "success", balRes, Date.now() - startBal);
    console.log("[scheduler] Daily balance sync completed:", balRes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logCronRun("balance-sync", "error", { error: msg }, 0);
    console.error("[scheduler] Daily balance sync failed:", msg);
  }

  // 2. Import & update provider services + detect price up/down & new services for Daily Updates feed
  try {
    const startSvc = Date.now();
    const svcRes = await importProviderServices(null);
    await logCronRun("import-services", "success", svcRes, Date.now() - startSvc);
    console.log("[scheduler] Daily services & pricing sync completed:", svcRes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logCronRun("import-services", "error", { error: msg }, 0);
    console.error("[scheduler] Daily services sync failed:", msg);
  }

  // 3. Sync pending order statuses from provider
  try {
    const startOrders = Date.now();
    const orderRes = await syncOrderStatuses();
    await logCronRun("status-sync", "success", orderRes, Date.now() - startOrders);
    console.log("[scheduler] Daily order status sync completed:", orderRes);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logCronRun("status-sync", "error", { error: msg }, 0);
    console.error("[scheduler] Daily order status sync failed:", msg);
  }
}

/**
 * Daily background scheduler that automatically runs provider balance sync,
 * service catalog & price updates, and order tracking once every 24 hours.
 */
export function initDailyScheduler() {
  if (isDailySchedulerInitialized) return;
  isDailySchedulerInitialized = true;

  console.log("[scheduler] Daily provider sync scheduler initialized (every 24h)");

  // Initial sequence on server start (after 15s delay to ensure DB and network readiness)
  setTimeout(() => {
    void executeDailySyncSequence();
  }, 15_000);

  // Daily recurring interval (every 24 hours)
  setInterval(() => {
    void executeDailySyncSequence();
  }, DAILY_INTERVAL_MS);
}
