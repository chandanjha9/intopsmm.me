import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ShieldCheck } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listMyRefills } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard/refill")({
  head: () => ({
    meta: [
      { title: "Refill Status — Intopsmm Dashboard" },
      {
        name: "description",
        content:
          "Track the status of every refill request you made from your order history: pending, requested or completed.",
      },
      { property: "og:title", content: "Refill Status — Intopsmm Dashboard" },
      {
        property: "og:description",
        content: "Track the status of your refill requests.",
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

function RefillPage() {
  const fetchRefills = useServerFn(listMyRefills);
  const [query, setQuery] = useState("");

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
    refetchInterval: 15_000,
  });

  const refills = Array.isArray(refillsQuery.data) ? refillsQuery.data : [];

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return refills;
    return refills.filter((row) => {
      const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
      return (
        (order?.service_name ?? "").toLowerCase().includes(q) ||
        (order?.link ?? "").toLowerCase().includes(q) ||
        String(row.provider_refill_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [refills, query]);

  return (
    <DashboardShell active="Refill">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Refill <span className="gradient-text">Status</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Request refills from Order History. This page only tracks their status.
        </p>
      </div>

      <Card className="glass border-border/60 p-4 shadow-card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search refills by service, link or refill ID"
            maxLength={120}
            className="h-11 rounded-xl border-border/60 bg-background pl-9"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {visible.length} refill request{visible.length === 1 ? "" : "s"}
        </p>
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
              {visible.map((row) => {
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
                    <td className="whitespace-nowrap px-4 py-4">{row.provider_refill_id ?? "—"}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                          statusTone[row.status] ?? "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabels[row.status] ?? row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
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
          <li>• Refill can be requested from Order History once an order is completed.</li>
          <li>• Only one active refill request is allowed per order at a time.</li>
          <li>• After requesting a refill, the button stays disabled for 24 hours.</li>
        </ul>
      </Card>
    </DashboardShell>
  );
}
