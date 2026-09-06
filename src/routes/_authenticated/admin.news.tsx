import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  BellRing,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  Sparkles,
  TrendingDown,
  Zap,
  Layers,
  Calendar,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  listAnnouncementsAdmin,
  createAnnouncementAdmin,
  updateAnnouncementAdmin,
  toggleAnnouncementActiveAdmin,
  deleteAnnouncementAdmin,
  type Announcement,
} from "@/lib/announcements.functions";

export const Route = createFileRoute("/_authenticated/admin/news")({
  head: () => ({
    meta: [
      { title: "News & Alerts Management — Admin Panel" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminNewsPage,
});

function AdminNewsPage() {
  const queryClient = useQueryClient();
  const fetchList = useServerFn(listAnnouncementsAdmin);
  const createFn = useServerFn(createAnnouncementAdmin);
  const updateFn = useServerFn(updateAnnouncementAdmin);
  const toggleActiveFn = useServerFn(toggleAnnouncementActiveAdmin);
  const deleteFn = useServerFn(deleteAnnouncementAdmin);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: () => fetchList(),
  });

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [postType, setPostType] = useState<"news" | "alert" | "price_drop" | "improvement">("news");
  const [badge, setBadge] = useState("");
  const [isPopup, setIsPopup] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("General");
    setPostType("news");
    setBadge("");
    setIsPopup(false);
    setIsActive(true);
    setEditingItem(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditModal = (item: Announcement) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description);
    setCategory(item.category || "General");
    setPostType(item.post_type);
    setBadge(item.badge || "");
    setIsPopup(item.is_popup);
    setIsActive(item.is_active);
    setIsCreateOpen(true);
  };

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingItem) {
        return await updateFn({
          data: {
            id: editingItem.id,
            title,
            description,
            category,
            post_type: postType,
            badge: badge.trim() || undefined,
            is_popup: isPopup,
            is_active: isActive,
          },
        });
      } else {
        return await createFn({
          data: {
            title,
            description,
            category,
            post_type: postType,
            badge: badge.trim() || undefined,
            is_popup: isPopup,
            is_active: isActive,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(editingItem ? "Announcement updated!" : "New announcement posted live!");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["daily-updates-list"] });
      queryClient.invalidateQueries({ queryKey: ["popup-alerts"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save announcement");
    },
  });

  // Toggle Active Mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await toggleActiveFn({ data: { id, isActive } });
    },
    onSuccess: () => {
      toast.success("Status updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["daily-updates-list"] });
      queryClient.invalidateQueries({ queryKey: ["popup-alerts"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to toggle status");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteFn({ data: { id } });
    },
    onSuccess: () => {
      toast.success("Announcement deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
      queryClient.invalidateQueries({ queryKey: ["daily-updates-list"] });
      queryClient.invalidateQueries({ queryKey: ["popup-alerts"] });
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete");
    },
  });

  const filtered = announcements.filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardShell active="News & Alerts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BellRing className="h-3.5 w-3.5" /> News, Updates & Popup Alerts
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Announcements & Alerts Manager
            </h1>
            <p className="text-sm text-muted-foreground">
              Post real-time news, service improvements, and popup alerts that appear directly to users.
            </p>
          </div>

          <Button variant="hero" size="sm" className="gap-2" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Create New Post / Alert
          </Button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="glass border-border/60 p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Total Announcements</p>
            <p className="mt-1 text-2xl font-bold">{announcements.length}</p>
          </Card>
          <Card className="glass border-border/60 p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Active / Live</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">
              {announcements.filter((a) => a.is_active).length}
            </p>
          </Card>
          <Card className="glass border-border/60 p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Popup Alerts</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {announcements.filter((a) => a.is_popup && a.is_active).length}
            </p>
          </Card>
          <Card className="glass border-border/60 p-4 shadow-card">
            <p className="text-xs text-muted-foreground">Inactive / Drafts</p>
            <p className="mt-1 text-2xl font-bold text-muted-foreground">
              {announcements.filter((a) => !a.is_active).length}
            </p>
          </Card>
        </div>

        {/* Search */}
        <Card className="glass border-border/60 p-4 shadow-card">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search announcements by title, content, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/80"
            />
          </div>
        </Card>

        {/* Posts List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="glass flex flex-col items-center justify-center p-12 text-center shadow-card">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-3 text-sm text-muted-foreground">Loading announcements…</p>
            </Card>
          ) : filtered.length === 0 ? (
            <Card className="glass flex flex-col items-center justify-center p-12 text-center shadow-card">
              <BellRing className="h-10 w-10 text-muted-foreground/40" />
              <h3 className="mt-3 text-base font-semibold">No announcements found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Click "Create New Post / Alert" to publish news or popup notices.
              </p>
            </Card>
          ) : (
            filtered.map((item) => (
              <Card
                key={item.id}
                className={`glass overflow-hidden border-border/60 p-5 shadow-card transition-all ${
                  !item.is_active ? "opacity-60 bg-muted/20" : ""
                }`}
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Active Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        }`}
                      >
                        {item.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {item.is_active ? "LIVE" : "DRAFT"}
                      </span>

                      {/* Popup Alert Tag */}
                      {item.is_popup && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Popup Alert Active
                        </span>
                      )}

                      {/* Badge */}
                      {item.badge && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {item.badge}
                        </span>
                      )}

                      <span className="rounded bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {item.category}
                      </span>

                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-foreground">{item.title}</h3>

                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {item.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0 pt-1">
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor={`switch-${item.id}`} className="text-xs text-muted-foreground">
                        {item.is_active ? "Active" : "Inactive"}
                      </Label>
                      <Switch
                        id={`switch-${item.id}`}
                        checked={item.is_active}
                        onCheckedChange={(checked) =>
                          toggleMutation.mutate({ id: item.id, isActive: checked })
                        }
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5"
                      onClick={() => openEditModal(item)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteConfirmId(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Create / Edit Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Announcement" : "Create New Post / Alert"}</DialogTitle>
              <DialogDescription>
                Publish news updates or popup notifications to your user base in real time.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="post-title">Title *</Label>
                <Input
                  id="post-title"
                  placeholder="e.g. ⚡ Instagram Fast Speed Upgrade or ⚠️ UPI QR Maintenance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-desc">Description / Content *</Label>
                <textarea
                  id="post-desc"
                  rows={4}
                  className="w-full rounded-md border border-input bg-background/80 p-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="Enter the detailed news description, instructions, or discount info..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="post-cat">Category</Label>
                  <select
                    id="post-cat"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="General">General News</option>
                    <option value="Instagram">Instagram</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Telegram">Telegram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Billing & Wallet">Billing & Wallet</option>
                    <option value="System Maintenance">System Maintenance</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="post-type">Post Type</Label>
                  <select
                    id="post-type"
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as any)}
                    className="h-10 w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm shadow-sm"
                  >
                    <option value="news">📰 News / Announcement</option>
                    <option value="alert">🚨 Urgent Alert</option>
                    <option value="price_drop">🔥 Price Drop</option>
                    <option value="improvement">⚡ Speed Upgrade</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="post-badge">Custom Badge Tag (Optional)</Label>
                <Input
                  id="post-badge"
                  placeholder="e.g. 🔥 Price Drop -20% or ⚡ 100K Speed or 🚨 Important"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                />
              </div>

              {/* Popup Toggle Card */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Show as Dashboard Modal Popup
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      When enabled, users opening their dashboard will immediately see this in an interactive popup window.
                    </p>
                  </div>
                  <Switch checked={isPopup} onCheckedChange={setIsPopup} />
                </div>
              </div>

              {/* Publish Live Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div>
                  <p className="text-sm font-semibold">Publish Live</p>
                  <p className="text-xs text-muted-foreground">Make this post immediately visible to users.</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="hero"
                size="sm"
                disabled={!title.trim() || !description.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Saving…" : editingItem ? "Update Post" : "Publish Post"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <Dialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Announcement?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. The post will be permanently deleted from the database.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              >
                {deleteMutation.isPending ? "Deleting…" : "Yes, Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardShell>
  );
}
