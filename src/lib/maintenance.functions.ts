import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { poolConnect } from "@/integrations/sqlServer/client";
import { requireAuth } from "@/lib/auth/auth-middleware";
import { checkUserRole } from "@/lib/auth/service.server";

export type MaintenanceStatus = {
  isMaintenance: boolean;
  message: string;
  estimatedTime?: string;
  updatedAt?: string;
};

// Ensure settings table exists
let tableInitPromise: Promise<void> | null = null;
async function ensureSettingsTable() {
  if (!tableInitPromise) {
    tableInitPromise = (async () => {
      try {
        const db = await poolConnect;
        await db.request().query(`
          IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='system_settings' AND xtype='U')
          BEGIN
            CREATE TABLE system_settings (
              setting_key VARCHAR(50) PRIMARY KEY,
              setting_value NVARCHAR(MAX),
              updated_at DATETIME DEFAULT GETDATE()
            );
            INSERT INTO system_settings (setting_key, setting_value)
            VALUES ('maintenance_mode', '{"enabled":false,"message":"We are currently upgrading our servers. Please check back shortly!","estimatedTime":"15-30 Minutes"}');
          END
        `);
      } catch (err) {
        console.error("Failed to ensure system_settings table:", err);
      }
    })();
  }
  return tableInitPromise;
}

/** Public check: Is maintenance mode active? (No auth required) */
export const getMaintenanceStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<MaintenanceStatus> => {
    // 1. First check environment variable override
    if (process.env.MAINTENANCE_MODE === "true" || process.env.MAINTENANCE_MODE === "1") {
      return {
        isMaintenance: true,
        message: process.env.MAINTENANCE_MESSAGE || "Scheduled Maintenance & System Upgrade in progress.",
        estimatedTime: process.env.MAINTENANCE_TIME || "15-30 Minutes",
      };
    }

    try {
      await ensureSettingsTable();
      const db = await poolConnect;
      const res = await db.request().query(`
        SELECT setting_value, updated_at
        FROM system_settings
        WHERE setting_key = 'maintenance_mode'
      `);

      if (res.recordset.length > 0) {
        const parsed = JSON.parse(res.recordset[0].setting_value || "{}");
        return {
          isMaintenance: Boolean(parsed.enabled),
          message: parsed.message || "Scheduled maintenance in progress. We will be back shortly!",
          estimatedTime: parsed.estimatedTime || "15-30 Minutes",
          updatedAt: res.recordset[0].updated_at ? new Date(res.recordset[0].updated_at).toISOString() : undefined,
        };
      }
    } catch (err) {
      console.warn("Could not query maintenance status, defaulting to normal operation:", err);
    }

    return {
      isMaintenance: false,
      message: "All systems operational.",
      estimatedTime: "",
    };
  }
);

/** Admin-only toggle: Turn maintenance mode ON or OFF */
export const setMaintenanceStatus = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .validator(
    z.object({
      enabled: z.boolean(),
      message: z.string().trim().max(300).optional(),
      estimatedTime: z.string().trim().max(100).optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const isAdmin = (await checkUserRole(context.userId, "admin")) || context.user?.role === "admin";
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin privileges required.");
    }

    await ensureSettingsTable();
    const db = await poolConnect;

    const payload = JSON.stringify({
      enabled: data.enabled,
      message: data.message || "We are currently upgrading our systems. Please check back shortly!",
      estimatedTime: data.estimatedTime || "15-30 Minutes",
    });

    await db.request().input("val", payload).query(`
      IF EXISTS (SELECT 1 FROM system_settings WHERE setting_key = 'maintenance_mode')
        UPDATE system_settings
        SET setting_value = @val, updated_at = GETDATE()
        WHERE setting_key = 'maintenance_mode'
      ELSE
        INSERT INTO system_settings (setting_key, setting_value, updated_at)
        VALUES ('maintenance_mode', @val, GETDATE())
    `);

    return { success: true, enabled: data.enabled };
  });
