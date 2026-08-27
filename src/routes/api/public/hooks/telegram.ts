import { createFileRoute } from "@tanstack/react-router";
import { handleTelegramWebhook } from "@/lib/telegram.server";

export const Route = createFileRoute("/api/public/hooks/telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          return handleTelegramWebhook(body);
        } catch (err) {
          console.error("[telegram hook] error:", err);
          return new Response("ok");
        }
      },
    },
  },
});
