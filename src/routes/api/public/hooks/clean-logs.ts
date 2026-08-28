import { createFileRoute } from "@tanstack/react-router";
import { runScheduledJob } from "@/lib/providers/cron.server";

export const Route = createFileRoute("/api/public/hooks/clean-logs")({
  server: {
    handlers: {
      POST: async ({ request }) => runScheduledJob("clean-logs", request),
    },
  },
});
