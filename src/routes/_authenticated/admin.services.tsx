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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatInr } from "@/lib/providers/pricing";
import {
  adminDeleteService,
  adminImportServices,
  adminListCatalog,
  adminListServices,
  adminSaveService,
} from "@/lib/providers/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/services")({
  head: () => ({
    meta: [
      { title: "Service Catalog & Pricing | Intopsmm Admin" },
      {
        name: "description",
        content:
          "Import supplier services, apply percentage or fixed markup, and publish sellable SMM services priced in Indian Rupees.",
      },
      { property: "og:title", content: "Service Catalog & Pricing | Intopsmm Admin" },
      {
        property: "og:description",
        content: "Import supplier services and control markup pricing in INR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminServicesPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Services">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="Services">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

type Draft = {
  id?: string;
  providerId: string;
  providerServiceId: string;
  name: string;
  category: string;
  platform: string;
  markupType: "percentage" | "fixed";
  markupValue: number;
  isActive: boolean;
};

function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const catalogFn = useServerFn(adminListCatalog);
  const servicesFn = useServerFn(adminListServices);
  const saveFn = useServerFn(adminSaveService);
  const deleteFn = useServerFn(adminDeleteService);
  const importFn = useServerFn(adminImportServices);

  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ["admin-catalog", search],
    queryFn: () => catalogFn({ data: { search: search || undefined, limit: 100 } }),
  });

  const { data: services } = useQuery({
    queryKey: ["admin-services"],
    queryFn: () => servicesFn(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-services"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-catalog"] });
    void queryClient.invalidateQueries({ queryKey: ["services"] });
  };

  const importJob = useMutation({
    mutationFn: () => importFn({ data: {} }),
    onSuccess: (result) => {
      toast.success("Catalog imported", {
        description: `${result.imported} imported · ${result.updated} updated`,
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Import failed", { description: error.message }),
  });

  const save = useMutation({
    mutationFn: (payload: Draft) =>
      saveFn({
        data: {
          id: payload.id,
          providerId: payload.providerId,
          providerServiceId: payload.providerServiceId,
          name: payload.name.trim(),
          category: payload.category.trim(),
          platform: payload.platform.trim(),
          markupType: payload.markupType,
          markupValue: Number(payload.markupValue),
          isActive: payload.isActive,
        },
      }),
    onSuccess: (result) => {
      toast.success("Service published", { description: `Selling rate ${formatInr(result.sellingRate)} / 1000` });
      setDraft(null);
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not save service", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Service removed");
      invalidate();
    },
    onError: (error: Error) => toast.error("Could not remove service", { description: error.message }),
  });

  return (
    <DashboardShell active="Services">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Service catalog</h1>
          <p className="text-sm text-muted-foreground">
            Import supplier services, then publish them with your markup.
          </p>
        </div>
        <Button className="ml-auto" disabled={importJob.isPending} onClick={() => importJob.mutate()}>
          {importJob.isPending ? "Importing…" : "Import from provider"}
        </Button>
      </div>

      {draft && (
        <Card className="glass border-border/60 p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {draft.id ? "Edit sellable service" : "Publish service"}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="service-name">Display name</Label>
              <Input
                id="service-name"
                value={draft.name}
                maxLength={160}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-category">Category</Label>
              <Input
                id="service-category"
                value={draft.category}
                maxLength={80}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="service-platform">Platform</Label>
              <Input
                id="service-platform"
                value={draft.platform}
                maxLength={40}
                onChange={(event) => setDraft({ ...draft, platform: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Markup type</Label>
                <Select
                  value={draft.markupType}
                  onValueChange={(value) =>
                    setDraft({ ...draft, markupType: value as Draft["markupType"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage %</SelectItem>
                    <SelectItem value="fixed">Fixed ₹ / 1000</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service-markup">Markup value</Label>
                <Input
                  id="service-markup"
                  type="number"
                  min={0}
                  step={0.01}
                  value={draft.markupValue}
                  onChange={(event) => setDraft({ ...draft, markupValue: Number(event.target.value) })}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="service-active"
                checked={draft.isActive}
                onCheckedChange={(checked) => setDraft({ ...draft, isActive: checked })}
              />
              <Label htmlFor="service-active">Visible to customers</Label>
            </div>
            <Button className="ml-auto" disabled={save.isPending} onClick={() => save.mutate(draft)}>
              Save service
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="glass border-border/60 p-5 shadow-card">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Provider catalog
            </h2>
            <Input
              className="ml-auto h-9 w-44"
              placeholder="Search services"
              value={search}
              maxLength={80}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {catalogLoading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}
          {catalog?.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing imported yet — run “Import from provider”.
            </p>
          )}
          <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {catalog?.map((item) => (
              <div key={item.id} className="rounded-xl border border-border/60 p-3">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  #{item.provider_service_id} · {item.category} · cost {Number(item.rate).toFixed(4)} / 1000 ·{" "}
                  {item.min_quantity}–{item.max_quantity}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() =>
                    setDraft({
                      providerId: item.provider_id,
                      providerServiceId: item.provider_service_id,
                      name: item.name,
                      category: item.category,
                      platform: item.category.split(" ")[0] ?? "Other",
                      markupType: "percentage",
                      markupValue: 25,
                      isActive: true,
                    })
                  }
                >
                  Publish with markup
                </Button>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass border-border/60 p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Sellable services
          </h2>
          {services?.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No published services yet.</p>
          )}
          <div className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
            {services?.map((service) => (
              <div key={service.id} className="rounded-xl border border-border/60 p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {service.name}
                  <Badge variant={service.is_active ? "default" : "secondary"}>
                    {service.is_active ? "Live" : "Hidden"}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {service.platform} · {service.category} · {formatInr(Number(service.selling_rate))} / 1000 ·{" "}
                  {service.markup_type === "percentage"
                    ? `+${service.markup_value}%`
                    : `+${formatInr(Number(service.markup_value))}`}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        id: service.id,
                        providerId: service.provider_id ?? "",
                        providerServiceId: service.provider_service_id ?? "",

                        name: service.name,
                        category: service.category,
                        platform: service.platform,
                        markupType: service.markup_type as Draft["markupType"],
                        markupValue: Number(service.markup_value),
                        isActive: service.is_active,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(service.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
