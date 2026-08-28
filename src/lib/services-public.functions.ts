import { createServerFn } from "@tanstack/react-start";
import { poolConnect } from "@/integrations/sqlServer/client";

export type PublicService = {
  id: string;
  name: string;
  category: string;
  platform: string | null;
  description: string | null;
  selling_rate: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean;
  cancel_supported: boolean;
};

/** Public services + prices catalogue (no auth) — same data users see after login. */
export const listPublicServices = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ services: PublicService[]; error: string | null }> => {
    try {
      const db = await poolConnect;
      const result = await db.request().query(`
        SELECT
          id,
          name,
          category,
          platform,
          description,
          selling_rate,
          min_quantity,
          max_quantity,
          refill_supported,
          cancel_supported
        FROM services
        WHERE is_active = 1
        ORDER BY category ASC, name ASC
      `);

      const services = result.recordset.map((row) => ({
        id: String(row.id),
        name: row.name,
        category: row.category ?? "Other",
        platform: row.platform ?? null,
        description: row.description ?? null,
        selling_rate: Number(row.selling_rate),
        min_quantity: Number(row.min_quantity),
        max_quantity: Number(row.max_quantity),
        refill_supported: Boolean(row.refill_supported),
        cancel_supported: Boolean(row.cancel_supported),
      }));

      return { services, error: null };
    } catch (err) {
      console.error("listPublicServices failed:", err);
      return {
        services: [],
        error: "Live price list is temporarily unavailable. Please try again shortly.",
      };
    }
  },
);
