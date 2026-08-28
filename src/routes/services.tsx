import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCcw, Search, ShieldCheck, XCircle, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listPublicServices } from "@/lib/services-public.functions";
import { Nav, Footer } from "@/routes/index";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Our Services & Price List — Intopsmm SMM Panel" },
      {
        name: "description",
        content:
          "Live Intopsmm service list with per-1000 prices, minimum and maximum order quantity, refill and cancel support for Instagram, YouTube, TikTok and more.",
      },
      { property: "og:title", content: "Our Services & Price List — Intopsmm SMM Panel" },
      {
        property: "og:description",
        content: "Browse every Intopsmm SMM service with live prices, min/max limits and refill support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

function money(v: number) {
  return `₹ ${v.toFixed(4)}`;
}

function ServicesPage() {
  const fetchServices = useServerFn(listPublicServices);
  const { data, isLoading } = useQuery({
    queryKey: ["public-services"],
    queryFn: () => fetchServices(),
    staleTime: 5 * 60 * 1000,
  });

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const services = data?.services ?? [];
  const loadError = data?.error ?? null;
  const categories = useMemo(
    () => Array.from(new Set(services.map((s) => s.category))).sort(),
    [services],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter(
      (s) =>
        (category === "all" || s.category === category) &&
        (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)),
    );
  }, [services, query, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <section className="bg-[image:var(--gradient-primary)] px-4 pb-14 pt-10 text-primary-foreground sm:px-6">
        <div className="mx-auto max-w-6xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
            <Zap className="h-3.5 w-3.5" /> Live Prices
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Our Services</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/85 sm:text-base">
            Same catalogue you get inside the dashboard — every rate is per 1000 units and updates
            automatically from our providers.
          </p>
        </div>
      </section>

      <main className="mx-auto -mt-8 max-w-6xl px-4 pb-20 sm:px-6">
        {/* Filters */}
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services…"
                className="h-11 pl-9"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Button asChild variant="hero" className="h-11">
              <Link to="/register">Start Ordering</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {isLoading ? "Loading live prices…" : `${filtered.length} services available`}
          </p>
          {loadError && (
            <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {loadError}
            </p>
          )}
        </div>

        {/* Tables per category */}
        <div className="mt-6 space-y-8">
          {grouped.map(([cat, rows]) => (
            <div key={cat} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-card">
              <div className="flex items-center justify-between border-b border-border/60 bg-secondary/50 px-4 py-3">
                <h2 className="text-sm font-bold uppercase tracking-wide">{cat}</h2>
                <span className="text-xs text-muted-foreground">{rows.length} services</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="px-4 py-3 font-semibold">Rate / 1000</th>
                      <th className="px-4 py-3 font-semibold">Min</th>
                      <th className="px-4 py-3 font-semibold">Max</th>
                      <th className="px-4 py-3 font-semibold">Refill</th>
                      <th className="px-4 py-3 font-semibold">Cancel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => (
                      <tr key={s.id} className="border-b border-border/40 last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-3">
                          <p className="font-medium">{s.name}</p>
                          {s.description && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.description}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">{money(s.selling_rate)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.min_quantity}</td>
                        <td className="px-4 py-3 text-muted-foreground">{s.max_quantity}</td>
                        <td className="px-4 py-3">
                          {s.refill_supported ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              <RefreshCcw className="h-3 w-3" /> Yes
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.cancel_supported ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold">
                              <ShieldCheck className="h-3 w-3" /> Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <XCircle className="h-3 w-3" /> No
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {!isLoading && grouped.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              No services match your search.
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
