import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RefreshCcw, Search, ExternalLink, ShieldCheck, Clock } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listMyOrders, listMyRefills, refillOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard/refill")({
  head: () => ({
    meta: [
      { title: "Refill Requests — GrowthPanel Dashboard" },
      {
        name: "description",
        content:
          "Request refills for completed SMM orders on refill-supported services and track every refill request status.",
      },
      { property: "og:title", content: "Refill Requests — GrowthPanel Dashboard" },
      {
        property: "og:description",
        content: "Request and track refills for your completed orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RefillPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Refill">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="Refill">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

const statusTone: Record<string, string> = {
  requested: "bg-primary/12 text-primary border-primary/25",
  pending: "bg-sky-500/12 text-sky-600 border-sky-500/25",
  completed: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  failed: "bg-destructive/12 text-destructive border-destructive/25",
};

const statusLabels: Record<string, string> = {
  requested: "Requested",
  pending: "Pending",
  completed: "Completed",
  failed: "Failed",
};

type OrderRow = Awaited<ReturnType<typeof listMyOrders>>[number];

const supplierId = (order: OrderRow) => {
  const link = Array.isArray(order.provider_orders) ? order.provider_orders[0] : order.provider_orders;
  return link?.provider_order_id ?? order.id.slice(0, 8);
};

function RefillPage() {
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(listMyOrders);
  const fetchRefills = useServerFn(listMyRefills);
  const submitRefill = useServerFn(refillOrder);
  const [query, setQuery] = useState("");

  const ordersQuery = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      try {
        const res = await fetchOrders();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });
  const refillsQuery = useQuery({
    queryKey: ["my-refills"],
    queryFn: async () => {
      try {
        const res = await fetchRefills();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
  });

  const refills = Array.isArray(refillsQuery.data) ? refillsQuery.data : [];
  const requestedOrderIds = useMemo(
    () => new Set(refills.filter((r) => r.status !== "failed").map((r) => r.order_id)),
    [refills],
  );

  const eligible = useMemo(() => {
    const list = Array.isArray(ordersQuery.data) ? ordersQuery.data : [];
    const rows = list.filter((order) => {
      if (order.status !== "completed") return false;
      const service = Array.isArray(order.services) ? order.services[0] : order.services;
      return Boolean(service?.refill_supported);
    });
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (order) =>
        supplierId(order).toLowerCase().includes(q) ||
        order.service_name.toLowerCase().includes(q) ||
        order.link.toLowerCase().includes(q),
    );
  }, [ordersQuery.data, query]);

  const mutation = useMutation({
    mutationFn: (orderId: string) => submitRefill({ data: { orderId } }),
    onSuccess: () => {
      toast.success("Refill request submitted. We will update the status shortly.");
      queryClient.invalidateQueries({ queryKey: ["my-refills"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <DashboardShell active="Refill">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Request a <span className="gradient-text">Refill</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Completed orders on refill-supported services can be topped back up to their delivered count.
        </p>
      </div>

      <Card className="glass border-border/60 p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search eligible orders by ID, service or link"
            maxLength={120}
            className="h-11 rounded-xl border-border/60 bg-background pl-9"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {eligible.length} eligible order{eligible.length === 1 ? "" : "s"}
        </p>
      </Card>

      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">Eligible orders</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Service and link</th>
                <th className="px-4 py-3">Quantity</th>
                <th className="px-4 py-3 text-right">Refill</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((order) => {
                const already = requestedOrderIds.has(order.id);
                const busy = mutation.isPending && mutation.variables === order.id;
                return (
                  <tr key={order.id} className="border-t border-border/60 align-top">
                    <td className="whitespace-nowrap px-4 py-4">
                      <p className="font-semibold">{supplierId(order)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="max-w-[24rem] px-4 py-4">
                      <p className="font-medium leading-snug">{order.service_name}</p>
                      <a
                        href={order.link}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{order.link}</span>
                      </a>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {order.quantity.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {already ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <Clock className="h-3.5 w-3.5" /> Requested
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => mutation.mutate(order.id)}
                        >
                          <RefreshCcw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                          {busy ? "Requesting" : "Request refill"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!eligible.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {ordersQuery.isLoading
                      ? "Loading your orders…"
                      : "No completed refill-supported orders yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="border-b border-border/60 px-4 py-3 text-sm font-semibold">Refill history</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Refill ID</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {refills.map((row) => {
                const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
                return (
                  <tr key={row.id} className="border-t border-border/60 align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="max-w-[22rem] px-4 py-4">
                      <p className="font-medium leading-snug">{order?.service_name ?? "Order"}</p>
                      <p className="truncate text-xs text-muted-foreground">{order?.link}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {row.provider_refill_id ?? "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          statusTone[row.status] ?? "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabels[row.status] ?? row.status}
                      </span>
                      {row.error_message && (
                        <p className="mt-1 text-xs text-destructive">{row.error_message}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!refills.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {refillsQuery.isLoading ? "Loading refill requests…" : "No refill requests yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="glass border-border/60 p-5 text-sm text-muted-foreground shadow-card">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Refill policy
        </p>
        <ul className="mt-2 space-y-1.5 text-xs">
          <li>• Refill works only on services that clearly mention refill support.</li>
          <li>• Eligibility is calculated as Start Count + Ordered Quantity, never Quantity + Quantity.</li>
          <li>• Request a refill only after the order is marked completed and the count has dropped.</li>
          <li>• One active refill request is allowed per order until the supplier closes it.</li>
        </ul>
      </Card>
    </DashboardShell>
  );
}
