import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      // throw redirect({ to: "/login" });
    }
    const { data: isAdmin, error } = await supabase.rpc("has_role", {
      _user_id: userId || "",
      _role: "admin",
    });
    if (error || !isAdmin) {
      // throw redirect({ to: "/dashboard" });
    }
    return { isAdmin: true };
  },
  component: () => <Outlet />,
});
