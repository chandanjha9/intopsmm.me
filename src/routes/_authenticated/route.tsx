import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { getMeServerFn } from "@/lib/auth/auth.functions";

// Stable query key for the auth session cache
const ME_QUERY_KEY = ["auth", "me"] as const;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    try {
      const res = await context.queryClient.ensureQueryData({
        queryKey: ME_QUERY_KEY,
        queryFn: () => getMeServerFn(),
        staleTime: 15_000, // 15 seconds cache so repeat navigations are fast but new logins are fresh
      });

      if (!res?.profile) {
        throw redirect({
          to: "/",
          search: { redirect: location.href },
        });
      }
      return { user: res.user, profile: res.profile };
    } catch (err) {
      // Re-throw TanStack redirect objects — they are intentional navigations
      if (isRedirect(err)) {
        throw err;
      }
      // Any real auth/network error → redirect to home
      throw redirect({
        to: "/",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
