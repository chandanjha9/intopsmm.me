import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { adminListAllOrders, adminUpdateOrderStatus, adminSyncStatuses } from "@/lib/providers/admin.functions";
import {
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  User,
  Link as LinkIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  head: () => ({
    meta: [
      { title: "Manage Orders | GrowthPanel Admin" },
      {
        name: "description",
        content: "View and manage all customer orders. Update order statuses, sync from provider, and handle refunds.",
      },
    ],
  }),
  component: AdminOrdersPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Orders">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
});

const STATUS_OPTIONS = [
  "all",
  "pending",
  "in_progress",
  "processing",
  "completed",
  "partial",
  "canceled",
  "refunded",
  "failed",
] as const;

type StatusOption = (typeof STATUS_OPTIONS)[number];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  processing: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  partial: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  canceled: "bg-red-500/20 text-red-400 border-red-500/30",
  refunded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  failed: "bg-red-700/20 text-red-300 border-red-700/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  in_progress: <Loader2 className="h-3 w-3 animate-spin" />,
  processing: <Loader2 className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle className="h-3 w-3" />,
  partial: <AlertTriangle className="h-3 w-3" />,
  canceled: <XCircle className="h-3 w-3" />,
  refunded: <XCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest ${color}`}
    >
      {STATUS_ICONS[status]}
      {status.replace("_", " ")}
    </span>
  );
}

type Order = {
  id: string;
  user_id: string;
  user_email: string;
  service_name: string;
  link: string;
  quantity: number;
  charge: number;
  status: string;
  start_count: number | null;
  remains: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  provider_order_id: string | null;
};

function UpdateStatusModal({
  order,
  onClose,
  onUpdated,
}: {
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const updateFn = useServerFn(adminUpdateOrderStatus);
  const [selectedStatus, setSelectedStatus] = useState<string>(order.status);
  const [remains, setRemains] = useState<string>(String(order.remains ?? ""));
  const [errorMsg, setErrorMsg] = useState<string>(order.error_message ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          orderId: order.id,
          status: selectedStatus as Order["status"],
          remains: remains !== "" ? Number(remains) : undefined,
          errorMessage: errorMsg || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Order status updated", {
        description: `Order #${order.id.slice(0, 8)} → ${selectedStatus.replace("_", " ")}`,
      });
      onUpdated();
      onClose();
    },
    onError: (err: Error) => toast.error("Update failed", { description: err.message }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-2xl border border-border/60 p-6 shadow-2xl">
        <h2 className="text-lg font-bold">Update Order Status</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Order ID: <span className="font-mono">{order.id.slice(0, 8)}…</span>
        </p>
        <p className="text-xs text-muted-foreground">{order.service_name}</p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              New Status
            </label>
            <select
              id="status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Remains (optional)
            </label>
            <Input
              id="remains-input"
              type="number"
              min={0}
              value={remains}
              onChange={(e) => setRemains(e.target.value)}
              placeholder="Leave blank to keep current"
              className="text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Error message (optional)
            </label>
            <Input
              id="error-msg-input"
              value={errorMsg}
              onChange={(e) => setErrorMsg(e.target.value)}
              placeholder="Optional error note"
              className="text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button
            id="update-status-submit"
            className="flex-1"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Update Status
          </Button>
          <Button id="update-status-cancel" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
        </div>

        {(selectedStatus === "canceled" || selectedStatus === "refunded") && (
          <p className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
            ⚠️ Setting to <strong>{selectedStatus}</strong> will automatically trigger a wallet refund if not already done.
          </p>
        )}
      </div>
    </div>
  );
}

function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const fetchOrders = useServerFn(adminListAllOrders);
  const syncFn = useServerFn(adminSyncStatuses);

  const [statusFilter, setStatusFilter] = useState<StatusOption>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-all-orders", statusFilter, search],
    queryFn: async () => {
      try {
        const res = await fetchOrders({
          data: {
            status: statusFilter !== "all" ? statusFilter : undefined,
            search: search || undefined,
            limit: 200,
          },
        });
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30_000,
  });

  const orders = Array.isArray(data) ? data : [];

  const syncJob = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (result: unknown) => {
      const r = result as { checked: number; updated: number };
      toast.success("Provider sync complete", {
        description: `Checked ${r.checked} orders · ${r.updated} status changes applied`,
      });
      void queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
    },
    onError: (err: Error) => toast.error("Sync failed", { description: err.message }),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of orders) {
      c[o.status] = (c[o.status] ?? 0) + 1;
    }
    return c;
  }, [orders]);

  return (
    <DashboardShell active="Orders">
      {selectedOrder && (
        <UpdateStatusModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdated={() => {
            void queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">All Orders</h1>
          <p className="text-sm text-muted-foreground">
            View and manage every customer order. Update statuses or sync from provider.
          </p>
        </div>
        <Button
          id="sync-orders-btn"
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={syncJob.isPending}
          onClick={() => syncJob.mutate()}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncJob.isPending ? "animate-spin" : ""}`} />
          Sync from Provider
        </Button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.filter((s) => s !== "all").map((s) => (
          <button
            key={s}
            id={`filter-${s}`}
            onClick={() => setStatusFilter(s)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
              statusFilter === s
                ? (STATUS_COLORS[s] ?? "bg-primary text-primary-foreground border-primary")
                : "border-border/60 text-muted-foreground hover:border-primary hover:text-foreground"
            }`}
          >
            {s.replace("_", " ")}
            {counts[s] !== undefined && (
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{counts[s]}</span>
            )}
          </button>
        ))}
        {statusFilter !== "all" && (
          <button
            id="filter-clear"
            onClick={() => setStatusFilter("all")}
            className="rounded-full border border-border/40 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="orders-search"
          placeholder="Search by email, link, or service…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {error && (
        <Card className="glass border-border/60 p-4 text-sm text-destructive">{(error as Error).message}</Card>
      )}
      {isLoading && (
        <Card className="glass border-border/60 p-6 text-center text-sm text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Loading orders…
        </Card>
      )}

      {!isLoading && orders.length === 0 && (
        <Card className="glass border-border/60 p-8 text-center text-sm text-muted-foreground">
          No orders found matching your filters.
        </Card>
      )}

      {/* Orders table */}
      {orders.length > 0 && (
        <Card className="glass overflow-hidden border-border/60 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30 text-left text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  <th className="px-4 py-3">Order / Date</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Service & Link</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Remains</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Charge</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {orders.map((order) => (
                  <tr key={order.id} className="group transition hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold text-foreground">
                        #{order.provider_order_id ?? order.id.slice(0, 8)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleString("en-IN")}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        {order.user_email ?? "—"}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <p className="truncate font-medium text-foreground">{order.service_name}</p>
                      <a
                        href={order.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 truncate text-[11px] text-primary hover:underline"
                      >
                        <LinkIcon className="h-2.5 w-2.5 shrink-0" />
                        {order.link}
                      </a>
                      {order.error_message && (
                        <p className="mt-0.5 truncate text-[11px] text-destructive">{order.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">{order.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      {order.remains !== null ? order.remains.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">₹{order.charge.toFixed(4)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        id={`update-order-${order.id}`}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs opacity-0 transition group-hover:opacity-100"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/40 px-4 py-2 text-xs text-muted-foreground">
            Showing {orders.length} order{orders.length !== 1 ? "s" : ""} · Auto-refreshes every 30s
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
