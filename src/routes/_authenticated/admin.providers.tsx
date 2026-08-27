import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  adminDeleteProvider,
  adminListProviders,
  adminSaveProvider,
  adminTestProvider,
} from "@/lib/providers/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({
    meta: [
      { title: "Supplier Providers | Intopsmm Admin" },
      {
        name: "description",
        content:
          "Add, edit and health-check SMM supplier APIs. Store encrypted API keys, set priority, timeouts and currency per provider.",
      },
      { property: "og:title", content: "Supplier Providers | Intopsmm Admin" },
      {
        property: "og:description",
        content: "Manage SMM supplier API credentials, priority and connection health.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminProvidersPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Providers">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="Providers">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

type FormState = {
  id?: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  priority: number;
  isActive: boolean;
  timeoutMs: number;
  currency: string;
};

const EMPTY: FormState = {
  name: "ElectroSMM",
  apiUrl: "https://electrosmm.com/api/v2",
  apiKey: "",
  priority: 1,
  isActive: true,
  timeoutMs: 15000,
  currency: "USD",
};

function AdminProvidersPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);

  const listFn = useServerFn(adminListProviders);
  const saveFn = useServerFn(adminSaveProvider);
  const deleteFn = useServerFn(adminDeleteProvider);
  const testFn = useServerFn(adminTestProvider);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: () => listFn(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: form.id,
          name: form.name.trim(),
          apiUrl: form.apiUrl.trim(),
          apiKey: form.apiKey.trim() || undefined,
          priority: Number(form.priority),
          isActive: form.isActive,
          timeoutMs: Number(form.timeoutMs),
          currency: form.currency.trim().toUpperCase(),
        },
      }),
    onSuccess: () => {
      toast.success("Provider saved");
      setForm(EMPTY);
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not save provider", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Provider removed");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not remove provider", { description: error.message }),
  });

  const test = useMutation({
    mutationFn: (id: string) => testFn({ data: { id } }),
    onSuccess: (result) => {
      if (result.ok) {
        toast.success("Connection OK", {
          description: `Balance ${result.balance?.toFixed(2)} ${result.currency ?? ""}`,
        });
      } else {
        toast.error("Connection failed", { description: result.message });
      }
      invalidate();
    },
    onError: (error: Error) => toast.error("Test failed", { description: error.message }),
  });

  return (
    <DashboardShell active="Providers">
      <div>
        <h1 className="text-2xl font-bold">Supplier providers</h1>
        <p className="text-sm text-muted-foreground">
          API keys are encrypted before storage and never returned to the browser.
        </p>
      </div>

      <Card className="glass border-border/60 p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {form.id ? "Edit provider" : "Add provider"}
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="provider-name">Name</Label>
            <Input
              id="provider-name"
              value={form.name}
              maxLength={80}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider-url">API URL</Label>
            <Input
              id="provider-url"
              value={form.apiUrl}
              maxLength={300}
              onChange={(event) => setForm((prev) => ({ ...prev, apiUrl: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="provider-key">API key {form.id && <span className="text-xs">(leave blank to keep)</span>}</Label>
            <Input
              id="provider-key"
              type="password"
              autoComplete="off"
              value={form.apiKey}
              maxLength={300}
              onChange={(event) => setForm((prev) => ({ ...prev, apiKey: event.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="provider-priority">Priority</Label>
              <Input
                id="provider-priority"
                type="number"
                min={1}
                max={100}
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provider-timeout">Timeout ms</Label>
              <Input
                id="provider-timeout"
                type="number"
                min={1000}
                max={60000}
                step={500}
                value={form.timeoutMs}
                onChange={(event) => setForm((prev) => ({ ...prev, timeoutMs: Number(event.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="provider-currency">Currency</Label>
              <Input
                id="provider-currency"
                value={form.currency}
                maxLength={3}
                onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="provider-active"
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
            <Label htmlFor="provider-active">Active</Label>
          </div>
          <Button className="ml-auto" disabled={save.isPending} onClick={() => save.mutate()}>
            {form.id ? "Update provider" : "Add provider"}
          </Button>
          {form.id && (
            <Button variant="outline" onClick={() => setForm(EMPTY)}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Card className="glass border-border/60 p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Configured providers</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
        {providers?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No providers yet — add your supplier above.</p>
        )}
        <div className="mt-3 space-y-3">
          {providers?.map((provider) => (
            <div
              key={provider.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-4"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-semibold">
                  {provider.name}
                  <Badge variant={provider.is_active ? "default" : "secondary"}>
                    {provider.is_active ? "Active" : "Paused"}
                  </Badge>
                  {provider.last_error && <Badge variant="destructive">Error</Badge>}
                </p>
                <p className="truncate text-xs text-muted-foreground">{provider.api_url}</p>
                <p className="text-xs text-muted-foreground">
                  Priority {provider.priority} · Balance{" "}
                  {provider.last_balance !== null && provider.last_balance !== undefined
                    ? `${provider.last_balance.toFixed(2)} ${provider.currency}`
                    : "—"}
                  {provider.has_api_key ? " · Key stored" : " · No key"}
                </p>
                {provider.last_error && (
                  <p className="mt-1 text-xs text-destructive">{provider.last_error}</p>
                )}
              </div>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={test.isPending}
                  onClick={() => test.mutate(provider.id)}
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({
                      id: provider.id,
                      name: provider.name,
                      apiUrl: provider.api_url,
                      apiKey: "",
                      priority: provider.priority,
                      isActive: provider.is_active,
                      timeoutMs: provider.timeout_ms,
                      currency: provider.currency,
                    })
                  }
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(provider.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
