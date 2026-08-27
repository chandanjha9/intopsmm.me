import { poolConnect } from "@/integrations/sqlServer/client";

const PING_INTERVAL_MS = 2.5 * 60 * 1000; // 2.5 minutes (150,000 ms)

let isInitialized = false;

/**
 * Keeps Render server active by sending internal HTTP pings and database warmups
 * every 2.5 minutes so Render never sleeps/spins down.
 */
export function initKeepAlive() {
  if (isInitialized) return;
  isInitialized = true;

  console.log("[keep-alive] Render auto keep-alive heartbeat initialized (every 2.5 mins)");

  setInterval(async () => {
    try {
      const port = process.env.PORT || 3000;
      const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;

      // 1. Ping local server endpoint
      try {
        await fetch(`http://localhost:${port}/api/public/ping`, {
          headers: { "User-Agent": "Intopsmm-KeepAlive/1.0" },
        });
      } catch {
        // Ignore local connection errors during startup
      }

      // 2. Ping external public URL if available on Render
      if (externalUrl) {
        try {
          const cleanUrl = externalUrl.replace(/\/+$/, "");
          await fetch(`${cleanUrl}/api/public/ping`, {
            headers: { "User-Agent": "Intopsmm-KeepAlive/1.0" },
          });
        } catch {
          // Ignore external network glitches
        }
      }

      // 3. Keep SQL Server database connection pool warm
      try {
        const db = await poolConnect;
        await db.request().query("SELECT 1 AS heartbeat");
      } catch {
        // Ignore db glitch
      }
    } catch (err) {
      console.warn("[keep-alive] Heartbeat ping error:", err instanceof Error ? err.message : err);
    }
  }, PING_INTERVAL_MS);
}

// Auto-start keep-alive on server import
initKeepAlive();
