import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  Receipt,
  Megaphone,
  MoreVertical,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  LogOut,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { isCurrentUserAdmin } from "@/lib/providers/admin.functions";

const navItems = [
  { icon: Plus, label: "New Order", to: "/dashboard" as const },
  { icon: Wallet, label: "Add Funds", to: "/dashboard/add-funds" as const },
  { icon: History, label: "Order History", to: "/dashboard/order-history" as const },
  { icon: ArrowLeftRight, label: "Transactions", to: "/dashboard/transactions" as const },
  { icon: RefreshCcw, label: "Refill", to: "/dashboard/refill" as const },
  { icon: Receipt, label: "Payment History", to: "/dashboard" as const },
  { icon: Megaphone, label: "Updates", to: "/dashboard" as const },
];

export function DashboardShell({ active, children }: { active: string; children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

  const sidebarPanel = (
    <>
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
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
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
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
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

      <Card className="glass border-border/60 p-4 shadow-card">
        <p className="text-sm font-semibold">Good Day 🤝</p>
        <p className="truncate text-xs text-muted-foreground">{username}</p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link to="/dashboard">Settings</Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowLogoutConfirm(true)}
          >
            Logout
          </Button>
        </div>
      </Card>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[28rem] w-[28rem] rounded-full bg-emerald-400/15 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-4 px-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow">
              <TrendingUp className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">Intopsmm</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="rounded-full lg:hidden"
              onClick={() => setMenuOpen(true)}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-6 py-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4">{sidebarPanel}</div>
        </aside>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-[19rem] overflow-y-auto p-4">
            <SheetHeader className="sr-only">
              <SheetTitle>Dashboard menu</SheetTitle>
            </SheetHeader>
            <div className="space-y-4" onClick={() => setMenuOpen(false)}>
              {sidebarPanel}
            </div>
          </SheetContent>
        </Sheet>

        <main className="min-w-0 flex-1 space-y-6">{children}</main>
      </div>

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl p-6 border-border/60">
          <DialogHeader className="space-y-2 text-center sm:text-left">
            <div className="mx-auto sm:mx-0 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <LogOut className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold">Confirm Log Out</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Are you sure you want to log out of your <strong>Intopsmm</strong> account? You will need to enter your password to log in again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isLoggingOut}
              onClick={() => setShowLogoutConfirm(false)}
              className="rounded-xl font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isLoggingOut}
              onClick={handleConfirmSignOut}
              className="rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoggingOut ? "Logging out…" : "Yes, Log Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
