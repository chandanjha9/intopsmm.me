import { createFileRoute } from "@tanstack/react-router";
import { handleRazorpayReturn } from "@/lib/razorpay.server";

export const Route = createFileRoute("/api/public/pay/razorpay-return")({
  server: {
    handlers: {
      POST: async ({ request }) => handleRazorpayReturn(request),
      GET: async () =>
        new Response(null, { status: 303, headers: { Location: "/dashboard/add-funds" } }),
    },
  },
});
