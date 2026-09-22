import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { isCurrentUserAdmin } from "@/lib/providers/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    // 1. Instant check if profile/user in parent layout context is already admin (0ms delay)
    if (context?.profile?.role === "admin" || (context as unknown as { user?: { role?: string } })?.user?.role === "admin") {
      return { isAdmin: true };
    }

    // 2. Cached verification with queryClient so repeat checks don't block
    try {
      const res = await context.queryClient.ensureQueryData({
        queryKey: ["is-admin", context?.profile?.id],
        queryFn: () => isCurrentUserAdmin(),
        staleTime: 5 * 60 * 1000,
      });

      if (!res?.isAdmin) {
        throw redirect({
          to: "/dashboard",
        });
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({
        to: "/dashboard",
      });
    }
    return { isAdmin: true };
  },
  component: () => <Outlet />,
});
