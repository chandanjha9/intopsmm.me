import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Verifies the caller is an admin using their own (RLS-scoped) client, then
 * hands back the service-role client for privileged work.
 */
export async function requireAdmin(
  userClient: SupabaseClient<Database>,
  userId: string,
): Promise<SupabaseClient<Database>> {
  const { data, error } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) {
    throw new Response("Unable to verify administrator access", { status: 403 });
  }
  if (!data) {
    throw new Response("Forbidden: administrator access required", { status: 403 });
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient<Database>;
}
