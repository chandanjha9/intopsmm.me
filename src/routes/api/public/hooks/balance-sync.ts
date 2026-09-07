import { createFileRoute } from "@tanstack/react-router";
import { runScheduledJob } from "@/lib/providers/cron.server";

export const Route = createFileRoute("/api/public/hooks/balance-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => runScheduledJob("balance-sync", request),
      POST: async ({ request }) => runScheduledJob("balance-sync", request),
    },
  },
});
