import { createFileRoute } from "@tanstack/react-router";
import { handleRazorpayWebhook } from "@/lib/payments.server";

export const Route = createFileRoute("/api/public/hooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature");
        return handleRazorpayWebhook(rawBody, signature);
      },
    },
  },
});
