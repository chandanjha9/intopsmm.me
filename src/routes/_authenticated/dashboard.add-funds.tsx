import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  QrCode,
  CreditCard,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { checkWalletTopup, createWalletTopup, listMyTopups } from "@/lib/payments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/add-funds")({
  head: () => ({
    meta: [
      { title: "Top Up Wallet — GrowthPanel" },
      {
        name: "description",
        content:
          "Scan the verified UPI QR code and top up your wallet instantly in INR.",
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

const QUICK_AMOUNTS = [1, 10, 100, 250, 500, 1000];
const MIN_AMOUNT = 1;
const MAX_AMOUNT = 200000;

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
  const [amount, setAmount] = useState("1");
  const [agreed, setAgreed] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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
  const canPay = amountReady && agreed && !isProcessing;

  // Open Official Razorpay Checkout with Verified UPI QR Code
  const handlePayNow = async () => {
    if (!canPay) return;
    setIsProcessing(true);

    try {
      const ready = await loadRazorpay();
      if (!ready || !window.Razorpay) {
        throw new Error("Could not load payment gateway. Please check your internet connection.");
      }

      // Create order on backend
      const session = await startTopup({ data: { amount: amt } });

      const checkout = new window.Razorpay({
        key: session.keyId,
        amount: Math.round(session.amount * 100),
        currency: "INR",
        name: "GrowMeSMM",
        description: `Wallet Top-Up ₹${session.amount}`,
        order_id: session.gatewayOrderId,
        theme: { color: "#10B981" },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: async () => {
          toast.loading("Payment received! Verifying and crediting wallet...");
          // Poll for automatic DB confirmation
          for (let i = 0; i < 12; i += 1) {
            await new Promise((r) => setTimeout(r, 2000));
            try {
              const status = await checkTopup({ data: { paymentOrderId: session.paymentOrderId } });
              if (status.status === "paid") {
                toast.dismiss();
                toast.success(`🎉 ₹${fmt.format(session.amount)} added to your wallet successfully!`);
                break;
              }
            } catch {
              /* retry */
            }
          }
          await queryClient.invalidateQueries();
          setIsProcessing(false);
        },
      });

      checkout.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to open payment gateway");
      setIsProcessing(false);
    }
  };

  return (
    <DashboardShell active="Add Funds">
      {/* Header Banner */}
      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Verified UPI &amp; Cards Gateway
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              TOP UP <span className="gradient-text">WALLET</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Instant auto-credit via PhonePe, Google Pay, Paytm, UPI QR, Cards &amp; Netbanking.
            </p>
          </div>
          <span className="hidden h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg sm:grid">
            <Wallet className="h-9 w-9" />
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Payment Form */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="glass border-border/60 p-6 shadow-card">
            <div className="space-y-5">
              {/* Amount Selection */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">
                  Enter Amount to Add (₹{MIN_AMOUNT} – ₹{fmt.format(MAX_AMOUNT)})
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Enter amount"
                    className="h-14 rounded-xl border-border/60 bg-background/80 pl-9 text-xl font-bold tracking-wide"
                  />
                </div>
                {amountError && <p className="text-xs font-medium text-destructive">{amountError}</p>}
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all ${
                      amt === val
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm"
                        : "border-border/60 bg-secondary/40 text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                    }`}
                  >
                    ₹{fmt.format(val)}
                  </button>
                ))}
              </div>

              {/* Agreement */}
              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  I understand funds added will be used for orders and no fraudulent chargebacks will be initiated.
                </span>
              </label>

              {/* Big CTA: Pay via UPI QR / Apps */}
              <Button
                variant="hero"
                className="h-14 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-base font-bold shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
                disabled={!canPay}
                onClick={handlePayNow}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Opening UPI QR Gateway…
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-5 w-5" />
                    Scan &amp; Pay {amountReady ? `₹${fmt.format(amt)}` : ""} (UPI QR / Cards)
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Badges / Support */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                <div className="rounded-xl border border-border/40 bg-secondary/20 p-2.5">
                  <p className="text-[11px] font-bold text-foreground">PhonePe &amp; GPay</p>
                  <p className="text-[9px] text-muted-foreground">Direct App / QR</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-secondary/20 p-2.5">
                  <p className="text-[11px] font-bold text-foreground">Paytm &amp; BHIM</p>
                  <p className="text-[9px] text-muted-foreground">Instant Scan</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-secondary/20 p-2.5">
                  <p className="text-[11px] font-bold text-foreground">Cards &amp; NetBanking</p>
                  <p className="text-[9px] text-muted-foreground">All Major Banks</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Passbook & Info */}
        <div className="space-y-6 lg:col-span-5">
          {/* Guide */}
          <Card className="glass border-border/60 p-5 shadow-card">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-4 w-4 text-emerald-400" /> How Payment Works
            </h3>
            <ol className="mt-3 space-y-2.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400">
                  1
                </span>
                <span>Enter amount and click <strong>Scan &amp; Pay</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400">
                  2
                </span>
                <span>Scan the verified <strong>UPI QR code</strong> with PhonePe, Google Pay, Paytm, or BHIM.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400">
                  3
                </span>
                <span>Payment is verified and your wallet is <strong>instantly credited</strong>!</span>
              </li>
            </ol>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              100% Secure Razorpay encrypted official banking gateway.
            </div>
          </Card>

          {/* Passbook History */}
          <Card className="glass border-border/60 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Top-Ups</h2>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["my-topups"] })}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {topups.isLoading && <p className="text-xs text-muted-foreground">Loading passbook…</p>}
              {!topups.isLoading && (topups.data?.length ?? 0) === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No top-ups yet. Your payments will appear here.</p>
              )}
              {topups.data?.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-secondary/30 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">
                      {p.gateway_payment_id || p.id.slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                      ₹{fmt.format(Number(p.amount))}
                    </span>
                    {p.status === "paid" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                      </span>
                    ) : p.status === "failed" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive">
                        <XCircle className="h-3.5 w-3.5" /> Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pending
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
