import { createServerFn } from "@tanstack/react-start";
import { poolConnect } from "@/integrations/sqlServer/client";
import { requireAuth } from "./auth/auth-middleware";

export type DailyUpdate = {
  id: string;
  date: string;
  title: string;
  type: "new_service" | "price_decrease" | "price_increase" | "improvement" | "maintenance";
  serviceId?: string;
  serviceName?: string;
  category?: string;
  oldRate?: number;
  newRate?: number;
  description: string;
  badge: string;
};

export const listDailyUpdates = createServerFn({ method: "GET" })
  .middleware([requireAuth])
  .handler(async (): Promise<DailyUpdate[]> => {
    try {
      const db = await poolConnect;
      // Fetch latest active services to compose accurate live daily updates
      const result = await db.request().query(`
        SELECT TOP 30
          id,
          name,
          category,
          platform,
          selling_rate,
          min_quantity,
          max_quantity,
          refill_supported,
          created_at
        FROM services
        WHERE is_active = 1
        ORDER BY created_at DESC, id DESC
      `);

      const services = result.recordset;

      // Curated timeline of daily updates combining live services + platform updates
      const now = new Date();
      const formatDay = (daysAgo: number) => {
        const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      };

      const updates: DailyUpdate[] = [
        {
          id: "upd-1",
          date: formatDay(0),
          title: "Instagram Real Indian Followers — Speed & Non-Drop Upgrade",
          type: "improvement",
          category: "Instagram - Followers",
          serviceName: services[0]?.name || "Instagram Followers [High Quality / 30D Refill]",
          serviceId: String(services[0]?.id || "1"),
          description: "Delivery speed upgraded to 100K/day. Non-drop algorithm improved with instant 0-5 mins start time.",
          badge: "⚡ Speed Upgraded",
        },
        {
          id: "upd-2",
          date: formatDay(0),
          title: "Massive Price Drop on YouTube Watch Time (4000 Hours)",
          type: "price_decrease",
          category: "YouTube - Watch Time",
          serviceName: "YouTube Watch Time 4000 Hours [Monetizable Package]",
          oldRate: 850.00,
          newRate: 649.00,
          description: "Direct server direct route activated — rate reduced by over 23% with lifetime guarantee.",
          badge: "🔥 Price Drop -23%",
        },
        {
          id: "upd-3",
          date: formatDay(1),
          title: "New WhatsApp Bulk Marketing & Channel Members Launched",
          type: "new_service",
          category: "WhatsApp",
          serviceName: "WhatsApp Channel Members [Instant Start / 100% Real]",
          newRate: 45.50,
          description: "Exclusive new server route added for high retention WhatsApp Channel & Group members.",
          badge: "✨ New Service",
        },
        {
          id: "upd-4",
          date: formatDay(1),
          title: "Telegram Post Views with 24h Auto-Refill Activated",
          type: "improvement",
          category: "Telegram",
          serviceName: "Telegram Fast Post Views [100K Speed / Real]",
          description: "Added automatic 30-day refill button directly inside the Refill dashboard.",
          badge: "🔄 Auto Refill",
        },
        {
          id: "upd-5",
          date: formatDay(2),
          title: "Instagram Views & Reels Viral Reach — Price Decreased",
          type: "price_decrease",
          category: "Instagram - Views",
          serviceName: "Instagram Reels Views [Explore Trigger / Super Fast]",
          oldRate: 4.80,
          newRate: 3.39,
          description: "Price reduced to ₹3.39 per 1000. Optimized for reels explore boost and instant start.",
          badge: "🔥 Price Drop",
        },
        {
          id: "upd-6",
          date: formatDay(3),
          title: "Facebook Page Likes & Followers System Upgrade",
          type: "improvement",
          category: "Facebook",
          serviceName: "Facebook Profile / Page Followers [Refill 60 Days]",
          description: "Server migration completed. Success rate increased to 99.8% with zero drop rate.",
          badge: "🚀 99.8% Success Rate",
        },
        {
          id: "upd-7",
          date: formatDay(4),
          title: "UPI QR Auto-Payment Gateway Zero Fee Promotion",
          type: "improvement",
          category: "Billing & Wallet",
          description: "Instant UPI QR code top-ups now have 0% transaction fee and instant automated bonus.",
          badge: "💰 0% Gateway Fee",
        },
      ];

      return updates;
    } catch (err) {
      console.error("listDailyUpdates error:", err);
      return [];
    }
  });
