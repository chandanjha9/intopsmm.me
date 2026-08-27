import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ping")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          status: "ok",
          service: "Intopsmm",
          timestamp: new Date().toISOString(),
          uptimeSec: Math.floor(process.uptime()),
        });
      },
    },
  },
});
