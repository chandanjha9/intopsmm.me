import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { adminListLogs } from "@/lib/providers/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/logs")({
  head: () => ({
    meta: [
      { title: "Provider API Logs | Intopsmm Admin" },
      {
        name: "description",
        content:
          "Inspect every supplier API call: action, HTTP status, latency, retries and error messages for fast troubleshooting.",
      },
      { property: "og:title", content: "Provider API Logs | Intopsmm Admin" },
      {
        property: "og:description",
        content: "Audit supplier API calls with status, latency and retry details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLogsPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="API Logs">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="API Logs">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

function AdminLogsPage() {
  const [action, setAction] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const listFn = useServerFn(adminListLogs);

  const { data: logs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-logs", action, onlyErrors],
    queryFn: () => listFn({ data: { action: action || undefined, onlyErrors, limit: 100 } }),
  });

  return (
    <DashboardShell active="API Logs">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Provider API logs</h1>
          <p className="text-sm text-muted-foreground">Last 100 supplier calls with latency and retries.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            className="h-9 w-40"
            placeholder="Filter action"
            value={action}
            maxLength={40}
            onChange={(event) => setAction(event.target.value)}
          />
          <Button
            size="sm"
            variant={onlyErrors ? "default" : "outline"}
            onClick={() => setOnlyErrors((prev) => !prev)}
          >
            Errors only
          </Button>
          <Button size="sm" variant="outline" disabled={isRefetching} onClick={() => void refetch()}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="glass border-border/60 p-5 shadow-card">
        {isLoading && <p className="text-sm text-muted-foreground">Loading logs…</p>}
        {logs?.length === 0 && <p className="text-sm text-muted-foreground">No log entries match this filter.</p>}
        <div className="space-y-2">
          {logs?.map((log) => (
            <div key={log.id} className="rounded-xl border border-border/60 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={log.error_message ? "destructive" : "default"}>{log.action}</Badge>
                <span className="text-xs text-muted-foreground">
                  HTTP {log.status_code ?? "—"} · {log.duration_ms ?? 0} ms · {log.retry_count ?? 0} retries
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              {log.error_message && <p className="mt-1 text-xs text-destructive">{log.error_message}</p>}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">Payload</summary>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-secondary/60 p-2 text-[11px]">
                  {JSON.stringify({ request: log.request_payload, response: log.response_payload }, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
