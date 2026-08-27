import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isCurrentUserAdmin } from "@/lib/providers/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const res = await isCurrentUserAdmin();
      if (!res?.isAdmin) {
        throw redirect({
          to: "/dashboard",
        });
      }
    } catch {
      throw redirect({
        to: "/dashboard",
      });
    }
    return { isAdmin: true };
  },
  component: () => <Outlet />,
});
