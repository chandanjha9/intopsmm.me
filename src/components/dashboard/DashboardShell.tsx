import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TrendingUp,
  Wallet,
  Plus,
  History,
  ArrowLeftRight,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  User,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { isCurrentUserAdmin } from "@/lib/providers/admin.functions";

const navItems = [
  { icon: Plus, label: "New Order", to: "/dashboard" as const, emoji: "🛒" },
  { icon: Wallet, label: "Add Funds", to: "/dashboard/add-funds" as const, emoji: "💰" },
  { icon: History, label: "Order History", to: "/dashboard/order-history" as const, emoji: "📋" },
  { icon: ArrowLeftRight, label: "Transactions", to: "/dashboard/transactions" as const, emoji: "💸" },
  { icon: RefreshCcw, label: "Refill", to: "/dashboard/refill" as const, emoji: "🔄" },
];

// Bottom tab bar items (most used on mobile)
const bottomTabItems = [
  { icon: Plus, label: "Order", to: "/dashboard" as const },
  { icon: Wallet, label: "Add Funds", to: "/dashboard/add-funds" as const },
  { icon: History, label: "History", to: "/dashboard/order-history" as const },
  { icon: ArrowLeftRight, label: "Txns", to: "/dashboard/transactions" as const },
  { icon: User, label: "Profile", to: "/dashboard" as const, isProfile: true },
];

export function DashboardShell({ active, children }: { active: string; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const isNavigating = useRouterState({ select: (state) => state.status === 'pending' });
  const checkAdmin = useServerFn(isCurrentUserAdmin);

  const { data: adminCheck } = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const res = await checkAdmin();
        return res;
      } catch {
        return { isAdmin: user?.role === "admin" };
      }
    },
  });

  const username = profile?.username ?? user?.email?.split("@")[0] ?? "member";
  const balance = `₹ ${(profile?.wallet_balance ?? 0).toFixed(4)}`;

  const handleConfirmSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await logout();
      setShowLogoutConfirm(false);
      navigate({ to: "/login", replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const sidebarContent = (
    <div className="space-y-4">
      {/* Wallet card */}
      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="bg-[image:var(--gradient-primary)] p-5 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-90">Wallet Balance</p>
          <p className="mt-1 text-3xl font-bold">{balance}</p>
        </div>
        <div className="p-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.label === active;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onMouseEnter={() => router.preloadRoute({ to: item.to })}
                  onClick={() => setMenuOpen(false)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
                </Link>
              );
            })}
          </nav>
          {adminCheck?.isAdmin && (
            <div className="mt-2 border-t border-border/60 pt-2">
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Administration
              </p>
              {(
                [
                  { label: "Admin Overview", to: "/admin" as const, Icon: ShieldCheck },
                  { label: "Orders", to: "/admin/orders" as const, Icon: ShoppingBag },
                  { label: "Providers", to: "/admin/providers" as const, Icon: ShieldCheck },
                  { label: "Services", to: "/admin/services" as const, Icon: ShieldCheck },
                  { label: "API Logs", to: "/admin/logs" as const, Icon: ShieldCheck },
                ] as const
              ).map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  onMouseEnter={() => router.preloadRoute({ to: item.to })}
                  onClick={() => setMenuOpen(false)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    item.label === active
                      ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* User card */}
      <Card className="glass border-border/60 p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-primary-foreground">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Good Day 🤝</p>
            <p className="truncate text-xs text-muted-foreground">{username}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => { setMenuOpen(false); setShowLogoutConfirm(true); }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className={`fixed top-0 inset-x-0 z-[100] h-1 bg-primary transition-opacity ${isNavigating ? "opacity-100" : "opacity-0"}`}></div>
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          {/* Brand */}
          <Link to="/dashboard" className="inline-flex items-center gap-2 shrink-0">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow">
              <TrendingUp className="h-4 w-4" />
            </span>
            <span className="text-base font-bold tracking-tight">Intopsmm</span>
          </Link>

          {/* Mobile: wallet balance pill in header */}
          <div className="lg:hidden ml-auto flex items-center gap-2">
            <Link
              to="/dashboard/add-funds"
              className="flex items-center gap-1.5 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>{balance}</span>
            </Link>
            <button
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background hover:bg-secondary transition"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop: spacer */}
          <div className="hidden lg:flex ml-auto" />
        </div>
      </header>

      {/* ===== MOBILE SLIDE-IN DRAWER ===== */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          {/* Drawer panel */}
          <div className="absolute left-0 top-0 h-full w-[min(85vw,320px)] overflow-y-auto bg-background p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <span className="font-bold">Intopsmm</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* ===== MAIN LAYOUT ===== */}
      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 pb-24 pt-4 sm:px-6 sm:pb-24 lg:pb-6 lg:py-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-20 space-y-4">{sidebarContent}</div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 space-y-4">{children}</main>
      </div>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl">
        <div className="flex h-16 items-stretch">
          {bottomTabItems.map((item) => {
            const isActive = item.label === active || (item.isProfile && false);
            const activeNavLabel = active;
            const tabActive = navItems.find(n => n.label === activeNavLabel)?.to === item.to && !item.isProfile;
            return (
              <Link
                key={item.label}
                to={item.to}
                onMouseEnter={() => router.preloadRoute({ to: item.to })}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
                  tabActive
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  tabActive ? "bg-primary/10" : ""
                }`}>
                  <item.icon className={`h-5 w-5 ${tabActive ? "text-primary" : ""}`} />
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ===== LOGOUT CONFIRM MODAL ===== */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6 border-border/60 mx-4">
          <DialogHeader className="space-y-2 text-center sm:text-left">
            <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <LogOut className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">Confirm Log Out</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to log out of your <strong>Intopsmm</strong> account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isLoggingOut}
              onClick={handleConfirmSignOut}
              className="flex-1 rounded-xl font-bold"
            >
              {isLoggingOut ? "Logging out…" : "Yes, Log Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
