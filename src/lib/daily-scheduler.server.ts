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

  // 4. Auto-broadcast Daily Service & Pricing Update to Telegram Channel (@intopsmm)
  try {
    const startBroadcast = Date.now();
    await broadcastDailyServiceUpdatesToChannel();
    console.log("[scheduler] Broadcasted daily service update to Telegram channel (@intopsmm)");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[scheduler] Failed to broadcast to Telegram channel:", msg);
  }
}

/**
 * Generates and broadcasts daily service pricing & catalog updates to Telegram channel (@intopsmm).
 */
export async function broadcastDailyServiceUpdatesToChannel() {
  try {
    const { poolConnect } = await import("@/integrations/sqlServer/client");
    const { sendTelegramChannelBroadcast } = await import("@/lib/telegram.server");
    const db = await poolConnect;

    // 1. Get recent price drops or new services from announcements
    const recentUpdates = await db.request().query(`
      SELECT TOP 4 title, description, category, badge, post_type, created_at
      FROM announcements
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);

    // 2. Get top featured lowest priced active services across key platforms
    const sampleServices = await db.request().query(`
      SELECT TOP 6 name, selling_rate, platform, category
      FROM services
      WHERE is_active = 1
      ORDER BY 
        CASE 
          WHEN LOWER(ISNULL(platform,'')) LIKE '%instagram%' THEN 1
          WHEN LOWER(ISNULL(platform,'')) LIKE '%youtube%' THEN 2
          WHEN LOWER(ISNULL(platform,'')) LIKE '%telegram%' THEN 3
          ELSE 4
        END ASC,
        selling_rate ASC
    `);

    const todayStr = new Date().toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    let servicesHighlight = "";
    if (sampleServices.recordset?.length) {
      servicesHighlight = sampleServices.recordset
        .map(
          (s: any) =>
            `• <b>${String(s.name).replace(/<[^>]*>/g, "").slice(0, 50)}</b>\n  └ 💰 <b>₹${Number(s.selling_rate).toFixed(2)} per 1000</b>`
        )
        .join("\n\n");
    }

    let announcementsBlock = "";
    if (recentUpdates.recordset?.length) {
      announcementsBlock =
        `\n\n📢 <b>LATEST SERVICE UPDATES:</b>\n` +
        recentUpdates.recordset
          .slice(0, 3)
          .map((a: any) => `• <b>${a.title}</b>`)
          .join("\n");
    }

    const message = `
🚀 <b>INTOPSMM — DAILY SERVICES & PRICING UPDATE</b>
━━━━━━━━━━━━━━━━━━━━━
📅 <b>Date:</b> ${todayStr}
⚡ <b>Server Status:</b> High Speed & Instant Delivery (0-10 Min Start)
💳 <b>Instant UPI Payment:</b> Active 24/7 (0% Fee, Auto Credit)

🔥 <b>POPULAR & CHEAPEST SERVICES TODAY:</b>
${servicesHighlight || "• Instagram Followers & Likes (Non-Drop HQ)\n• YouTube Watch Hours & Subscribers\n• Telegram Members & Views"}
${announcementsBlock}
━━━━━━━━━━━━━━━━━━━━━
👇 <i>Click the button below to view all 1600+ services and place orders:</i>
`.trim();

    return await sendTelegramChannelBroadcast({
      message,
      buttonText: "⚡ Order on Intopsmm Panel",
      buttonUrl: "https://intopsmm.me/dashboard",
    });
  } catch (err) {
    console.error("[broadcastDailyServiceUpdatesToChannel] Error:", err);
    return false;
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
