import { createFileRoute } from "@tanstack/react-router";
import { runScheduledJob } from "@/lib/providers/cron.server";

export const Route = createFileRoute("/api/public/hooks/retry-failed-orders")({
  server: {
    handlers: {
      POST: async ({ request }) => runScheduledJob("retry-failed-orders", request),
    },
  },
});
