import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Search,
  Zap,
  ShieldCheck,
  RefreshCcw,
  Info,
  ShoppingCart,
  Check,
  Filter,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listServices } from "@/lib/orders.functions";
import { formatInr } from "@/lib/providers/pricing";

export const Route = createFileRoute("/_authenticated/dashboard/services")({
  head: () => ({
    meta: [
      { title: "Services List — Intopsmm Dashboard" },
      { name: "description", content: "View all available SMM services, live pricing, and limits." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardServicesPage,
});

type ServiceItem = {
  id: string;
  name: string;
  category: string;
  platform: string | null;
  description: string | null;
  selling_rate: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean;
  cancel_supported: boolean;
  provider_service_id: string | null;
};

function DashboardServicesPage() {
  const navigate = useNavigate();
  const fetchServices = useServerFn(listServices);

  const { data: services = [], isLoading } = useQuery<ServiceItem[]>({
    queryKey: ["dashboard-services-list"],
    queryFn: async () => {
      const res = await fetchServices();
      return (res as ServiceItem[]) || [];
    },
    staleTime: 60 * 1000,
  });

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set).sort();
  }, [services]);

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services
      .filter((s) => {
        const matchesCategory = selectedCategory === "all" || s.category === selectedCategory;
        const matchesSearch =
          !q ||
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          String(s.id).toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => a.selling_rate - b.selling_rate);
  }, [services, search, selectedCategory]);

  return (
    <DashboardShell active="Services">
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" /> All Services & Live Prices
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Services Catalog
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse over {services.length || "1,600+"} instant delivery services with live rates and refill guarantees.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="hero"
              size="sm"
              className="gap-2"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              <ShoppingCart className="h-4 w-4" />
              New Order
            </Button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <Card className="glass border-border/60 p-4 shadow-card">
          <div className="grid gap-3 md:grid-cols-12">
            {/* Search Input */}
            <div className="relative md:col-span-7">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by service name, ID, or keyword..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/80"
              />
            </div>

            {/* Category Dropdown */}
            <div className="relative md:col-span-5">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">📁 All Categories ({services.length})</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c} ({services.filter((s) => s.category === c).length})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Services Table / Grid */}
        <Card className="glass overflow-hidden border-border/60 shadow-card">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">Loading services catalog…</p>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Filter className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">No services match your search</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try clearing your filters or searching a different term.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3">ID</th>
                    <th className="px-3 py-3.5">Service Name</th>
                    <th className="px-3 py-3.5">Rate / 1000</th>
                    <th className="px-3 py-3.5">Min / Max</th>
                    <th className="px-3 py-3.5">Refill</th>
                    <th className="py-3.5 pl-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredServices.map((service) => (
                    <tr
                      key={service.id}
                      className="group transition-colors hover:bg-secondary/40"
                    >
                      {/* Service ID — shows actual API service ID from provider */}
                      <td className="py-3.5 pl-4 pr-3 font-mono text-xs font-semibold text-muted-foreground">
                        #{service.provider_service_id ?? service.id}
                      </td>

                      {/* Service Name & Category */}
                      <td className="max-w-md px-3 py-3.5">
                        <p className="line-clamp-2 font-medium text-foreground group-hover:text-primary transition-colors">
                          {service.name}
                        </p>
                        <span className="mt-0.5 inline-block rounded bg-secondary/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {service.category}
                        </span>
                      </td>

                      {/* Selling Rate */}
                      <td className="whitespace-nowrap px-3 py-3.5">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatInr(service.selling_rate)}
                        </span>
                      </td>

                      {/* Min / Max */}
                      <td className="whitespace-nowrap px-3 py-3.5 text-xs text-muted-foreground">
                        {service.min_quantity.toLocaleString()} / {service.max_quantity.toLocaleString()}
                      </td>

                      {/* Refill Badge */}
                      <td className="whitespace-nowrap px-3 py-3.5">
                        {service.refill_supported ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                            No
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="whitespace-nowrap py-3.5 pl-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={() => setSelectedService(service)}
                          >
                            <Info className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="hero"
                            size="sm"
                            className="h-8 px-3 text-xs gap-1"
                            onClick={() => navigate({ to: "/dashboard" })}
                          >
                            Order <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Service Details Modal */}
        <Dialog open={Boolean(selectedService)} onOpenChange={(open) => !open && setSelectedService(null)}>
          {selectedService && (
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <div className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Service #{selectedService.id}
                </div>
                <DialogTitle className="mt-2 text-lg font-bold leading-snug">
                  {selectedService.name}
                </DialogTitle>
                <DialogDescription>
                  Category: {selectedService.category}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Price per 1000</p>
                    <p className="mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
                      {formatInr(selectedService.selling_rate)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Refill Support</p>
                    <p className="mt-1 text-base font-bold">
                      {selectedService.refill_supported ? "✅ Guaranteed" : "❌ No Refill"}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Min Quantity</p>
                    <p className="mt-1 text-sm font-semibold">{selectedService.min_quantity.toLocaleString()}</p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground">Max Quantity</p>
                    <p className="mt-1 text-sm font-semibold">{selectedService.max_quantity.toLocaleString()}</p>
                  </div>
                </div>

                {selectedService.description && (
                  <div className="space-y-1 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                    <p className="text-xs font-semibold text-foreground">Service Description & Rules</p>
                    <p className="whitespace-pre-line text-xs text-muted-foreground leading-relaxed">
                      {selectedService.description}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedService(null)}>
                  Close
                </Button>
                <Button
                  variant="hero"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setSelectedService(null);
                    navigate({ to: "/dashboard" });
                  }}
                >
                  <ShoppingCart className="h-4 w-4" /> Place Order
                </Button>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </DashboardShell>
  );
}
