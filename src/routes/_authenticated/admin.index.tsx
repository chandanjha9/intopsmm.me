import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Wrench, Power, ExternalLink, Gamepad2, ShieldAlert } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  adminCleanLogs,
  adminImportServices,
  adminOverview,
  adminRetryFailedOrders,
  adminSyncBalances,
  adminSyncStatuses,
} from "@/lib/providers/admin.functions";
import {
  getMaintenanceStatus,
  setMaintenanceStatus,
} from "@/lib/maintenance.functions";

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

  const checkMaintenance = useServerFn(getMaintenanceStatus);
  const toggleMaintenance = useServerFn(setMaintenanceStatus);

  const { data: maintenanceData, refetch: refetchMaintenance } = useQuery({
    queryKey: ["admin-maintenance-status"],
    queryFn: () => checkMaintenance(),
  });

  const [customMsg, setCustomMsg] = useState("");
  const [customTime, setCustomTime] = useState("");

  const isMActive = Boolean(maintenanceData?.isMaintenance);

  const maintenanceMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      return toggleMaintenance({
        data: {
          enabled: enable,
          message: customMsg.trim() || undefined,
          estimatedTime: customTime.trim() || undefined,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        res.enabled
          ? "Maintenance Mode is now ACTIVE! Visitors see the orange screen with the game."
          : "Maintenance Mode is now DEACTIVATED! Site is live for everyone."
      );
      void queryClient.invalidateQueries({ queryKey: ["admin-maintenance-status"] });
      void queryClient.invalidateQueries({ queryKey: ["app-maintenance-status"] });
      void refetchMaintenance();
    },
    onError: (err: Error) => {
      toast.error("Failed to update maintenance mode: " + err.message);
    },
  });

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

      {/* Maintenance Mode Controller */}
      <Card
        className={`p-5 shadow-card transition-all border-2 ${
          isMActive
            ? "border-orange-500/80 bg-orange-950/20 shadow-orange-500/10"
            : "border-border/60 glass"
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`flex h-2.5 w-2.5 rounded-full ${isMActive ? "bg-orange-500 animate-pulse" : "bg-emerald-500"}`} />
              <h2 className="text-base font-bold flex items-center gap-2">
                <Wrench className="h-4 w-4 text-orange-400" />
                Site Maintenance Mode & Deployment Screen
              </h2>
              <Badge
                variant={isMActive ? "default" : "outline"}
                className={
                  isMActive
                    ? "bg-orange-500 text-stone-950 font-bold"
                    : "text-muted-foreground"
                }
              >
                {isMActive ? "ACTIVE (Orange Screen + Game)" : "OFF (Site Live)"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, visitors will see the orange maintenance screen with the interactive arcade mini-game. Admins can still access the dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isMActive ? "destructive" : "default"}
              size="sm"
              disabled={maintenanceMutation.isPending}
              onClick={() => maintenanceMutation.mutate(!isMActive)}
              className={`gap-2 font-bold ${
                !isMActive
                  ? "bg-orange-500 text-stone-950 hover:bg-orange-400"
                  : ""
              }`}
            >
              <Power className="h-4 w-4" />
              {isMActive ? "Turn Maintenance OFF" : "Turn Maintenance ON"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="border-orange-500/30 text-xs"
            >
              <a href="/?bypass=0" target="_blank" rel="noopener noreferrer" className="gap-1.5 flex items-center">
                <Gamepad2 className="h-3.5 w-3.5 text-orange-400" />
                <span>Preview Screen & Game</span>
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </Button>
          </div>
        </div>

        {/* Optional Message Config */}
        <div className="mt-4 grid gap-3 border-t border-border/40 pt-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-muted-foreground">Custom Status Message (Optional):</label>
            <Input
              placeholder={maintenanceData?.message || "e.g. Upgrading servers for faster delivery..."}
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Estimated Time (Optional):</label>
            <Input
              placeholder={maintenanceData?.estimatedTime || "e.g. 15-30 Minutes"}
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="mt-1 h-8 text-xs"
            />
          </div>
        </div>
      </Card>

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
