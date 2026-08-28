import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  Search,
  Copy,
  List,
  PauseCircle,
  Loader,
  CheckCircle2,
  BatteryMedium,
  LineChart,
  Ban,
  ExternalLink,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listMyOrders } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard/order-history")({
  head: () => ({
    meta: [
      { title: "Order History — Intopsmm Dashboard" },
      {
        name: "description",
        content:
          "Track every SMM order you placed: status, start count, delivered quantity, link and price in INR.",
      },
      { property: "og:title", content: "Order History — Intopsmm Dashboard" },
      { property: "og:description", content: "Track all your order statuses in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderHistoryPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Order History">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="Order History">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

const filters = [
  { key: "All", match: [] as string[], Icon: List, tone: "text-foreground" },
  { key: "Pending", match: ["pending"], Icon: PauseCircle, tone: "text-sky-500" },
  { key: "In Progress", match: ["in_progress"], Icon: Loader, tone: "text-primary" },
  { key: "Completed", match: ["completed"], Icon: CheckCircle2, tone: "text-emerald-500" },
  { key: "Partial", match: ["partial"], Icon: BatteryMedium, tone: "text-complementary" },
  { key: "Processing", match: ["processing"], Icon: LineChart, tone: "text-indigo-500" },
  { key: "Canceled", match: ["canceled", "refunded", "failed", "error"], Icon: Ban, tone: "text-destructive" },
];

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  in_progress: "In Progress",
  completed: "Completed",
  partial: "Partial",
  canceled: "Canceled",
  refunded: "Refunded",
  failed: "Failed",
  error: "Failed",
};

const statusTone: Record<string, string> = {
  completed: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  in_progress: "bg-primary/12 text-primary border-primary/25",
  pending: "bg-sky-500/12 text-sky-600 border-sky-500/25",
  partial: "bg-complementary/15 text-complementary border-complementary/30",
  processing: "bg-indigo-500/12 text-indigo-500 border-indigo-500/25",
  canceled: "bg-destructive/12 text-destructive border-destructive/25",
  failed: "bg-destructive/12 text-destructive border-destructive/25",
  error: "bg-destructive/12 text-destructive border-destructive/25",
  refunded: "bg-muted text-muted-foreground border-border",
};

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

function OrderHistoryPage() {
  const { refreshProfile } = useAuth();
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const fetchOrders = useServerFn(listMyOrders);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      try {
        const res = await fetchOrders();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 5_000, // Poll every 5s so status updates and refunds appear quickly
  });

  // Periodically refresh profile balance so refunded balance updates immediately in sidebar
  useEffect(() => {
    const timer = setInterval(() => {
      void refreshProfile();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshProfile]);

  const displayId = (order: (typeof orders)[number]) => {
    const links = (order as { provider_orders?: { provider_order_id: string | null }[] | { provider_order_id: string | null } | null })
      .provider_orders;
    const link = Array.isArray(links) ? links[0] : links;
    return link?.provider_order_id ?? order.id.slice(0, 8);
  };

  const visible = useMemo(() => {
    const active = filters.find((item) => item.key === filter);
    const q = query.trim().toLowerCase();
    const list = Array.isArray(orders) ? orders : [];
    return list.filter((order) => {
      const matchesFilter =
        !active || active.match.length === 0 || active.match.includes(order.status);
      const matchesQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        displayId(order).toLowerCase().includes(q) ||
        (order.service_name ?? "").toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [orders, filter, query]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const copySelected = () => {
    const rows = orders.filter((order) => selected.includes(order.id));
    const text = (rows.length ? rows : visible)
      .map((order) =>
        [
          displayId(order),
          new Date(order.created_at).toLocaleString(),
          order.service_name,
          order.link,
          order.quantity,
          statusLabels[order.status] ?? order.status,
          inr(Number(order.charge ?? 0)),
        ].join("\t"),
      )
      .join("\n");
    if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text);
  };

  return (
    <DashboardShell active="Order History">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Your <span className="gradient-text">Orders</span>
        </h1>
        <p className="text-sm text-muted-foreground">Track all your order status!</p>
      </div>

      <Card className="glass border-border/60 p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID or Name"
            maxLength={80}
            className="h-11 rounded-xl border-border/60 bg-background pl-9"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f.key
                  ? "border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                  : `border-border/60 bg-secondary/50 ${f.tone} hover:bg-secondary`
              }`}
            >
              <f.Icon className="h-3.5 w-3.5" />
              {f.key}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {visible.length} order{visible.length === 1 ? "" : "s"}
            {selected.length ? ` • ${selected.length} selected` : ""}
          </p>
          <Button variant="outline" size="sm" onClick={copySelected}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      </Card>

      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3">ID and date</th>
                <th className="px-4 py-3">Service and link</th>
                <th className="whitespace-nowrap px-4 py-3">Start</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-t border-border/60 align-top transition hover:bg-secondary/40"
                  onClick={() => toggle(order.id)}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selected.includes(order.id)}
                      onChange={() => toggle(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="h-4 w-4 accent-[hsl(var(--primary))]"
                      aria-label={`Select order ${order.id}`}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <p className="font-semibold">{displayId(order)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </td>
                  <td className="max-w-[26rem] px-4 py-4">
                    <p className="font-medium leading-snug">{order.service_name}</p>
                    <a
                      href={order.link}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{order.link}</span>
                    </a>
                    {order.error_message && (
                      <p className="mt-1 text-xs text-destructive">
                        {["canceled", "cancelled", "refunded"].includes(String(order.status).toLowerCase())
                          ? "Refunded"
                          : order.error_message}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                    {order.start_count ?? 0}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4">
                    <p className="font-semibold">{order.quantity.toLocaleString("en-IN")}</p>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        statusTone[order.status] ?? "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {statusLabels[order.status] ?? order.status}
                    </span>
                    {order.remains !== null && order.remains !== undefined && (
                      <p className="mt-1 text-xs text-muted-foreground">Remains {order.remains}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-right font-semibold">
                    {inr(Number(order.charge ?? 0))}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr className="border-t border-border/60">
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {isLoading ? "Loading your orders…" : "No orders found for this filter."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}
