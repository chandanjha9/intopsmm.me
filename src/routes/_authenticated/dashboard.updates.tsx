import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BellRing,
  TrendingDown,
  Sparkles,
  Zap,
  RefreshCcw,
  Search,
  CheckCircle2,
  ArrowRight,
  Filter,
  Calendar,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { getUserActiveAnnouncements, type Announcement } from "@/lib/announcements.functions";
import { listDailyUpdates, type DailyUpdate } from "@/lib/updates.functions";
import { formatInr } from "@/lib/providers/pricing";

export const Route = createFileRoute("/_authenticated/dashboard/updates")({
  head: () => ({
    meta: [
      { title: "Daily Updates & Alerts — Intopsmm Dashboard" },
      { name: "description", content: "Stay updated with recent price changes, new service launches, and system announcements." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardUpdatesPage,
});

type CombinedFeedItem = {
  id: string;
  title: string;
  description: string;
  category?: string;
  badge?: string;
  date: string;
  type: string;
  isPopup?: boolean;
  serviceName?: string;
  oldRate?: number;
  newRate?: number;
};

function DashboardUpdatesPage() {
  const navigate = useNavigate();
  const fetchAnnouncements = useServerFn(getUserActiveAnnouncements);
  const fetchSystemUpdates = useServerFn(listDailyUpdates);

  const { data: dbAnnouncements = [], isLoading: isAnnouncementsLoading } = useQuery<Announcement[]>({
    queryKey: ["user-announcements-list"],
    queryFn: async () => {
      const res = await fetchAnnouncements();
      return res || [];
    },
    staleTime: 30 * 1000,
  });

  const { data: systemUpdates = [], isLoading: isSystemLoading } = useQuery<DailyUpdate[]>({
    queryKey: ["daily-updates-list"],
    queryFn: async () => {
      const res = await fetchSystemUpdates();
      return res || [];
    },
    staleTime: 60 * 1000,
  });

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filterTabs = [
    { id: "all", label: "All Updates", icon: Layers },
    { id: "alert", label: "Alerts & Notices", icon: AlertTriangle },
    { id: "price_decrease", label: "Price Drops", icon: TrendingDown },
    { id: "new_service", label: "New Services", icon: Sparkles },
    { id: "improvement", label: "Upgrades & Speed", icon: Zap },
  ];

  // Merge database announcements (priority) with system updates
  const combinedItems: CombinedFeedItem[] = useMemo(() => {
    const adminPosts: CombinedFeedItem[] = dbAnnouncements.map((a) => ({
      id: `ann-${a.id}`,
      title: a.title,
      description: a.description,
      category: a.category,
      badge: a.badge || (a.post_type === "alert" ? "🚨 Important Alert" : "📰 Admin Announcement"),
      date: new Date(a.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      type: a.post_type,
      isPopup: a.is_popup,
    }));

    const systemPosts: CombinedFeedItem[] = systemUpdates.map((u) => ({
      id: u.id,
      title: u.title,
      description: u.description,
      category: u.category,
      badge: u.badge,
      date: u.date,
      type: u.type,
      serviceName: u.serviceName,
      oldRate: u.oldRate,
      newRate: u.newRate,
    }));

    // Put admin posts on top, followed by system updates
    return [...adminPosts, ...systemPosts];
  }, [dbAnnouncements, systemUpdates]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return combinedItems.filter((u) => {
      const matchesType =
        activeFilter === "all" ||
        u.type === activeFilter ||
        (activeFilter === "price_decrease" && u.type === "price_drop");
      const matchesSearch =
        !q ||
        u.title.toLowerCase().includes(q) ||
        u.description.toLowerCase().includes(q) ||
        (u.category && u.category.toLowerCase().includes(q)) ||
        (u.serviceName && u.serviceName.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [combinedItems, search, activeFilter]);

  const isLoading = isAnnouncementsLoading || isSystemLoading;

  return (
    <DashboardShell active="Daily Updates">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BellRing className="h-3.5 w-3.5" /> Live Notification Feed
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Daily Updates & Alerts
            </h1>
            <p className="text-sm text-muted-foreground">
              Live service updates, urgent notices, rate changes, and new platform features published in real time.
            </p>
          </div>
        </div>

        {/* Filter Tabs & Search */}
        <Card className="glass border-border/60 p-4 shadow-card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {filterTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search updates by keyword, category, or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/80"
            />
          </div>
        </Card>

        {/* Updates Feed */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="glass flex flex-col items-center justify-center border-border/60 p-12 text-center shadow-card">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">Loading updates…</p>
            </Card>
          ) : filteredItems.length === 0 ? (
            <Card className="glass flex flex-col items-center justify-center border-border/60 p-12 text-center shadow-card">
              <Filter className="h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-base font-semibold">No updates found</h3>
              <p className="mt-1 text-sm text-muted-foreground">Try clearing your filters or changing search keywords.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch("");
                  setActiveFilter("all");
                }}
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`glass group overflow-hidden border-border/60 p-5 shadow-card transition-all hover:border-primary/40 hover:shadow-lg ${
                  item.type === "alert" ? "border-amber-500/40 bg-amber-500/[0.03]" : ""
                }`}
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.type === "alert" ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> {item.badge || "Important Alert"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {item.badge || "Update"}
                        </span>
                      )}

                      {item.category && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {item.category}
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {item.date}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>

                    {item.serviceName && (
                      <p className="text-xs font-medium text-muted-foreground">
                        Service: <span className="text-foreground">{item.serviceName}</span>
                      </p>
                    )}

                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {item.description}
                    </p>

                    {/* Price Comparison if applicable */}
                    {(item.oldRate !== undefined || item.newRate !== undefined) && (
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        {item.oldRate !== undefined && (
                          <span className="line-through text-muted-foreground">
                            Old: {formatInr(item.oldRate)}
                          </span>
                        )}
                        {item.newRate !== undefined && (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            New: {formatInr(item.newRate)} / 1K
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 pt-1">
                    <Button
                      variant="hero"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => navigate({ to: "/dashboard" })}
                    >
                      Place Order <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
