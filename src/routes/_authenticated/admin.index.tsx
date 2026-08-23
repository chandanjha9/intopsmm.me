import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  adminCleanLogs,
  adminImportServices,
  adminOverview,
  adminRetryFailedOrders,
  adminSyncBalances,
  adminSyncStatuses,
} from "@/lib/providers/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Overview | Intopsmm Control Center" },
      {
        name: "description",
        content:
          "Monitor supplier balance, imported services, order pipeline health and API errors from the Intopsmm admin overview.",
      },
      { property: "og:title", content: "Admin Overview | Intopsmm" },
      {
        property: "og:description",
        content: "Supplier balance, service catalog and order pipeline health in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminOverviewPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Admin Overview">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="Admin Overview">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="glass border-border/60 p-5 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function AdminOverviewPage() {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(adminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 60_000,
  });

  const useJob = (
    label: string,
    fn: () => Promise<unknown>,
  ) =>
    useMutation({
      mutationFn: fn,
      onSuccess: (result) => {
        toast.success(`${label} finished`, { description: JSON.stringify(result) });
        void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      },
      onError: (mutationError: Error) => toast.error(`${label} failed`, { description: mutationError.message }),
    });

  const importFn = useServerFn(adminImportServices);
  const balanceFn = useServerFn(adminSyncBalances);
  const statusFn = useServerFn(adminSyncStatuses);
  const retryFn = useServerFn(adminRetryFailedOrders);
  const cleanFn = useServerFn(adminCleanLogs);

  const importJob = useJob("Service import", () => importFn({ data: {} }));
  const balanceJob = useJob("Balance sync", () => balanceFn());
  const statusJob = useJob("Status sync", () => statusFn());
  const retryJob = useJob("Retry failed orders", () => retryFn());
  const cleanJob = useJob("Log cleanup", () => cleanFn());

  const primary = data?.providers?.[0];

  return (
    <DashboardShell active="Admin Overview">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admin overview</h1>
          <p className="text-sm text-muted-foreground">Supplier health, catalog and order pipeline.</p>
        </div>
        <Badge
          className="ml-auto"
          variant={data?.health === "healthy" ? "default" : "destructive"}
        >
          {data?.health === "healthy"
            ? "Healthy"
            : data?.health === "not_configured"
              ? "No provider configured"
              : "Degraded"}
        </Badge>
      </div>

      {error && <Card className="glass border-border/60 p-4 text-sm text-destructive">{error.message}</Card>}
      {isLoading && <Card className="glass border-border/60 p-6 text-sm">Loading metrics…</Card>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              label="Provider balance"
              value={
                primary?.last_balance !== null && primary?.last_balance !== undefined
                  ? `${primary.last_balance.toFixed(2)} ${primary.currency}`
                  : "—"
              }
              hint={
                primary?.last_balance_at
                  ? `Updated ${new Date(primary.last_balance_at).toLocaleString()}`
                  : "Never synced"
              }
            />
            <Stat
              label="Imported services"
              value={String(data.importedServices)}
              hint={`${data.internalServices} sellable services`}
            />
            <Stat
              label="Orders in progress"
              value={String(data.orders.pending + data.orders.in_progress)}
              hint={`${data.orders.completed} completed · ${data.orders.failed} failed`}
            />
            <Stat
              label="API errors (24h)"
              value={String(data.apiErrors24h)}
              hint={data.lastSyncAt ? `Last job ${new Date(data.lastSyncAt).toLocaleString()}` : "No jobs yet"}
            />
          </div>

          <Card className="glass border-border/60 p-5 shadow-card">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Manual jobs</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={importJob.isPending} onClick={() => importJob.mutate()}>
                Import services
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={balanceJob.isPending}
                onClick={() => balanceJob.mutate()}
              >
                Sync balance
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={statusJob.isPending}
                onClick={() => statusJob.mutate()}
              >
                Sync order status
              </Button>
              <Button size="sm" variant="outline" disabled={retryJob.isPending} onClick={() => retryJob.mutate()}>
                Retry failed orders
              </Button>
              <Button size="sm" variant="outline" disabled={cleanJob.isPending} onClick={() => cleanJob.mutate()}>
                Clean logs
              </Button>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass border-border/60 p-5 shadow-card">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                Recent scheduled runs
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.cronRuns.length === 0 && <li className="text-muted-foreground">No runs recorded yet.</li>}
                {data.cronRuns.map((run, index) => (
                  <li key={`${run.job_name}-${index}`} className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${run.status === "success" ? "bg-primary" : "bg-destructive"}`}
                    />
                    <span className="font-medium">{run.job_name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(run.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="glass border-border/60 p-5 shadow-card">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Notifications</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {data.notifications.length === 0 && (
                  <li className="text-muted-foreground">No alerts. Everything looks calm.</li>
                )}
                {data.notifications.map((note) => (
                  <li key={note.id} className="rounded-lg border border-border/60 p-2">
                    <p className="font-medium">{note.title}</p>
                    {note.message && <p className="text-xs text-muted-foreground">{note.message}</p>}
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {note.severity} · {new Date(note.created_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
