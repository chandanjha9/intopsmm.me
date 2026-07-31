import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Wallet,
  ShieldCheck,
  Info,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  QrCode,
  CreditCard,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { checkWalletTopup, createWalletTopup, listMyTopups } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/dashboard/add-funds")({
  head: () => ({
    meta: [
      { title: "Top Up Wallet — GrowthPanel" },
      {
        name: "description",
        content:
          "Scan the UPI QR with your entered amount and top up your GrowthPanel wallet instantly in INR.",
      },
      { property: "og:title", content: "Top Up Wallet — GrowthPanel" },
      { property: "og:description", content: "Enter an amount, scan the QR and pay with any UPI app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AddFundsPage,
});

const QUICK_AMOUNTS = [100, 250, 500, 1000, 2500];
const MIN_AMOUNT = 20;
const MAX_AMOUNT = 200000;

// Your UPI receiving address (Razorpay / bank VPA).
const UPI_VPA = "chandanjha45@ybl";
const UPI_NAME = "GrowthPanel";

function upiLink(amount: number) {
  return `upi://pay?pa=${encodeURIComponent(UPI_VPA)}&pn=${encodeURIComponent(
    UPI_NAME,
  )}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent("Wallet top-up")}`;
}

function qrImage(amount: number, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    upiLink(amount),
  )}`;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function AddFundsPage() {
  const [amount, setAmount] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [gatewayError, setGatewayError] = useState("");

  const queryClient = useQueryClient();
  const fetchTopups = useServerFn(listMyTopups);
  const startTopup = useServerFn(createWalletTopup);
  const checkTopup = useServerFn(checkWalletTopup);
  const fmt = useMemo(() => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }), []);
  const amt = Math.max(0, Number(amount) || 0);

  const topups = useQuery({ queryKey: ["my-topups"], queryFn: () => fetchTopups({}) });

  const amountError =
    amount !== "" && (amt < MIN_AMOUNT || amt > MAX_AMOUNT)
      ? `Enter an amount between ₹${MIN_AMOUNT} and ₹${fmt.format(MAX_AMOUNT)}`
      : "";

  const amountReady = !amountError && amt >= MIN_AMOUNT;
  const canPay = amountReady && agreed;

  const payWithRazorpay = async () => {
    setGatewayError("");
    setGatewayBusy(true);
    try {
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) throw new Error("Could not load the payment gateway. Check your connection.");

      const session = await startTopup({ data: { amount: amt } });

      const checkout = new window.Razorpay({
        key: session.keyId,
        amount: Math.round(session.amount * 100),
        currency: "INR",
        name: UPI_NAME,
        description: "Wallet top-up",
        order_id: session.gatewayOrderId,
        theme: { color: "#22C55E" },
        handler: async () => {
          // Webhook credits the wallet; poll until it lands.
          for (let i = 0; i < 12; i += 1) {
            await new Promise((r) => setTimeout(r, 2500));
            try {
              const status = await checkTopup({ data: { paymentOrderId: session.paymentOrderId } });
              if (status.status === "paid") break;
            } catch {
              /* keep polling */
            }
          }
          await queryClient.invalidateQueries();
        },
        modal: { ondismiss: () => setGatewayBusy(false) },
      });
      checkout.open();
    } catch (error) {
      setGatewayError(error instanceof Error ? error.message : "Payment could not be started.");
    } finally {
      setGatewayBusy(false);
    }
  };


  return (
    <DashboardShell active="Add Funds">
      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-complementary/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-complementary">
              GrowthPanel
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              TOP UP <span className="gradient-text">WALLET</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the amount you want to add — the QR code updates with that exact amount. Scan and pay with any
              UPI app.
            </p>
          </div>
          <span className="hidden h-20 w-20 shrink-0 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground sm:grid">
            <Wallet className="h-9 w-9" />
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass border-border/60 p-5 shadow-card">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount (₹{MIN_AMOUNT} – ₹{fmt.format(MAX_AMOUNT)})</Label>
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Enter payment amount"
                className="h-12 rounded-xl border-border/60 bg-background text-lg font-semibold"
              />
              {amountError && <p className="text-xs font-medium text-destructive">{amountError}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  className="rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                >
                  ₹{fmt.format(value)}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
                <CreditCard className="h-3.5 w-3.5" /> Instant — auto verified
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pay with UPI, cards, netbanking or wallets. Your balance updates automatically once the payment
                succeeds.
              </p>
              <Button
                variant="hero"
                className="mt-3 h-12 w-full rounded-xl text-base"
                disabled={!canPay || gatewayBusy}
                onClick={payWithRazorpay}
              >
                {gatewayBusy ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Opening checkout…
                  </>
                ) : (
                  <>
                    Pay {amountReady ? `₹${fmt.format(amt)}` : ""} with Razorpay
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
              {gatewayError && <p className="mt-2 text-xs font-medium text-destructive">{gatewayError}</p>}
            </div>

            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or pay manually <span className="h-px flex-1 bg-border" />
            </div>



            {/* Live QR */}
            <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4 text-center">
              <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <QrCode className="h-3.5 w-3.5" /> Scan &amp; pay
              </p>
              <div className="mx-auto my-3 grid aspect-square w-full max-w-[230px] place-items-center overflow-hidden rounded-xl border border-border/60 bg-white p-2 shadow-card">
                {amountReady ? (
                  <img
                    src={qrImage(amt, 230)}
                    alt={`UPI QR code for ₹${fmt.format(amt)}`}
                    className="h-full w-full rounded-lg object-contain"
                  />
                ) : (
                  <span className="px-4 text-xs font-medium text-muted-foreground">
                    Enter an amount (min ₹{MIN_AMOUNT}) to generate the QR
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {amountReady ? `₹${fmt.format(amt)}` : "—"}{" "}
                <span className="font-normal text-muted-foreground">· {UPI_VPA}</span>
              </p>
              {amountReady && (
                <a
                  href={qrImage(amt, 512)}
                  download={`growthpanel-upi-${amt}.png`}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <Download className="h-3.5 w-3.5" /> Download QR
                </a>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-secondary/40 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Info className="h-3.5 w-3.5" /> How it works
              </p>
              <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {[
                  "Enter the amount you want to add.",
                  "Scan the QR with any UPI app — the amount is pre-filled.",
                  "On mobile you can tap Pay to open your UPI app directly.",
                ].map((line, i) => (
                  <li key={line} className="flex gap-2">
                    <span className="font-semibold text-foreground">{i + 1}.</span>
                    {line}
                  </li>
                ))}
              </ol>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-muted-foreground">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
              <span>
                I understand that after the funds are added I will not raise a fraudulent dispute or charge-back.
              </span>
            </label>

            <Button
              asChild={canPay}
              variant="hero"
              className="h-12 w-full rounded-xl text-base"
              disabled={!canPay}
            >
              {canPay ? (
                <a href={upiLink(amt)}>
                  Pay ₹{fmt.format(amt)} <ArrowRight className="ml-1 h-4 w-4" />
                </a>
              ) : (
                <span>
                  Pay <ArrowRight className="ml-1 h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Payments go straight to the official GrowthPanel
              UPI address.
            </p>
          </div>
        </Card>


        <Card className="glass border-border/60 p-5 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Passbook</h2>
          <div className="mt-4 space-y-3">
            {topups.isLoading && <p className="text-sm text-muted-foreground">Loading your top-ups…</p>}
            {!topups.isLoading && (topups.data?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No top-ups yet. Your payments will appear here.</p>
            )}
            {topups.data?.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {p.gateway_payment_id ?? p.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-primary/12 px-3 py-1 text-sm font-bold text-primary">
                    ₹{fmt.format(Number(p.amount))}
                  </span>
                  {p.status === "paid" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Paid" />
                  ) : p.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-destructive" aria-label="Failed" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Pending" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
