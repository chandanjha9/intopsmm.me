import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, List, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { listMyTransactions } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Intopsmm Dashboard" },
      {
        name: "description",
        content:
          "Review every wallet transaction: additions, deductions and refunds with amounts in INR, dates and linked order IDs.",
      },
      { property: "og:title", content: "Transactions — Intopsmm Dashboard" },
      { property: "og:description", content: "Every credit, debit and refund on your Intopsmm wallet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TransactionsPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Transactions">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="Transactions">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

const typeTone: Record<string, string> = {
  credit: "bg-emerald-500/12 text-emerald-600 border-emerald-500/25",
  debit: "bg-destructive/12 text-destructive border-destructive/25",
};

const typeIcon: Record<string, typeof ArrowDownLeft> = {
  credit: ArrowDownLeft,
  debit: ArrowUpRight,
};

const filters = ["All", "credit", "debit"] as const;

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;

function TransactionsPage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const fetchTransactions = useServerFn(listMyTransactions);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["my-transactions"],
    queryFn: async () => {
      try {
        const res = await fetchTransactions();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 60_000,
  });

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(transactions) ? transactions : [];
    return list.filter(
      (t) =>
        (filter === "All" || t.type === filter) &&
        (!q || t.id.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)),
    );
  }, [transactions, filter, query]);

  const totals = useMemo(() => {
    const list = Array.isArray(transactions) ? transactions : [];
    const isRefund = (t: any) =>
      t.type === "credit" &&
      t.description &&
      (t.description.toLowerCase().includes("refund") ||
       t.description.toLowerCase().includes("cancel"));

    const manualAdded = list
      .filter((t) => t.type === "credit" && !isRefund(t))
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const spentOnOrders = list
      .filter((t) => t.type === "debit")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const refundedAmt = list
      .filter(isRefund)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const debited = Math.max(0, spentOnOrders - refundedAmt);
    const credited = manualAdded;

    return { credited, debited };
  }, [transactions]);


  return (
    <DashboardShell active="Transactions">

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Your <span className="gradient-text">Transactions</span>
            </h1>
            <p className="text-sm text-muted-foreground">Every credit, debit and refund on your wallet.</p>
          </div>

          <section className="grid gap-4 sm:grid-cols-3">
            <Card className="glass border-border/60 p-4 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total Credited</p>
              <p className="mt-1 text-xl font-bold text-emerald-600">{inr(totals.credited)}</p>
            </Card>
            <Card className="glass border-border/60 p-4 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Total Deducted</p>
              <p className="mt-1 text-xl font-bold text-destructive">{inr(totals.debited)}</p>
            </Card>
            <Card className="glass border-border/60 p-4 shadow-card">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Transactions</p>
              <p className="mt-1 text-xl font-bold">{transactions.length}</p>
            </Card>
          </section>

          <Card className="glass border-border/60 p-4 shadow-card">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by transaction ID, order ID or detail"
                className="h-11 rounded-xl border-border/60 bg-background pl-9"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((f) => {
                const Icon = f === "All" ? List : typeIcon[f];
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                      filter === f
                        ? "border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground shadow-glow"
                        : "border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {f}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="glass overflow-hidden border-border/60 shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-secondary/60 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">₹ Amount</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((t) => {
                    const Icon = typeIcon[t.type] ?? List;
                    const isDebit = t.type === "debit";
                    return (
                      <tr key={t.id} className="border-t border-border/60 align-top transition hover:bg-secondary/40">
                        <td className="whitespace-nowrap px-4 py-4 font-semibold">{t.id.slice(0, 8)}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                              typeTone[t.type] ?? "border-border bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-3 w-3" />
                            {t.type}
                          </span>
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-4 font-semibold ${
                            isDebit ? "text-destructive" : "text-emerald-600"
                          }`}
                        >
                          {isDebit ? "−" : "+"}
                          {inr(Number(t.amount))}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-xs text-muted-foreground">{t.description ?? "Wallet activity"}</p>
                          <Link
                            to="/dashboard/order-history"
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View orders
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Balance after {inr(Number(t.balance_after))}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                  {visible.length === 0 && (
                    <tr className="border-t border-border/60">
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        {isLoading ? "Loading transactions…" : "No transactions found."}
                      </td>
                    </tr>
                  )}

                </tbody>
              </table>
            </div>
          </Card>
    </DashboardShell>
  );
}
