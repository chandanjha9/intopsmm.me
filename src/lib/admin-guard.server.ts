import { checkUserRole } from "@/lib/auth/service.server";

/**
 * Verifies the caller has the 'admin' role in SQL Server.
 */
export async function requireAdmin(userId: string): Promise<void> {
  if (!userId) {
    throw new Response(JSON.stringify({ error: "Unauthorized: Please log in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isAdmin = await checkUserRole(userId, "admin");
  if (!isAdmin) {
    throw new Response(JSON.stringify({ error: "Forbidden: Administrator access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
}
