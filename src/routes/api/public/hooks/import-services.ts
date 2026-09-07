import { createFileRoute } from "@tanstack/react-router";
import { runScheduledJob } from "@/lib/providers/cron.server";

export const Route = createFileRoute("/api/public/hooks/import-services")({
  server: {
    handlers: {
      GET: async ({ request }) => runScheduledJob("import-services", request),
      POST: async ({ request }) => runScheduledJob("import-services", request),
    },
  },
});
