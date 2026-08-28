import { createFileRoute } from "@tanstack/react-router";
import { runScheduledJob } from "@/lib/providers/cron.server";

export const Route = createFileRoute("/api/public/hooks/import-services")({
  server: {
    handlers: {
      POST: async ({ request }) => runScheduledJob("import-services", request),
    },
  },
});
