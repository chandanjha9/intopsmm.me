import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMeServerFn } from "@/lib/auth/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    try {
      const res = await getMeServerFn();
      if (!res?.profile) {
        throw redirect({
          to: "/login",
          search: {
            redirect: location.href,
          },
        });
      }
      return { user: res.user, profile: res.profile };
    } catch {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: () => <Outlet />,
});
