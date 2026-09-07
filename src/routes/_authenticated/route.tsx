import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMeServerFn } from "@/lib/auth/auth.functions";

// Stable query key for the auth session cache
const ME_QUERY_KEY = ["auth", "me"] as const;

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location, context }) => {
    try {
      // ensureQueryData returns instantly from cache on repeat navigations.
      // DB / Firebase is only hit once per 5-minute window, making module
      // switches feel near-instant instead of waiting 300-700 ms every time.
      const res = await context.queryClient.ensureQueryData({
        queryKey: ME_QUERY_KEY,
        queryFn: () => getMeServerFn(),
        staleTime: 5 * 60_000, // treat cached session as fresh for 5 minutes
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
      if (err instanceof Response || (err && typeof err === "object" && "to" in err)) {
        throw err;
      }
      // Any real auth/network error → redirect to login
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
