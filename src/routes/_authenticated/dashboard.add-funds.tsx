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
  Loader2,
  CheckCircle2,
  QrCode,
  Sparkles,
  Check,
  CreditCard,
  Zap,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import {
  submitStaticUpiPayment,
  fetchStaticQrCode,
  startRazorpayCheckout,
  confirmRazorpayPayment,
} from "@/lib/payments.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/add-funds")({
  head: () => ({
    meta: [
      { title: "Top Up Wallet — Intopsmm" },
      {
        name: "description",
        content:
          "Scan the UPI QR code, pay the amount, and enter the transaction UTR number to add funds to your wallet instantly.",
      },
      { property: "og:title", content: "Top Up Wallet — Intopsmm" },
      { property: "og:description", content: "Scan the QR code and submit UTR to top up your wallet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AddFundsPage,
});

const QUICK_AMOUNTS = [20, 50, 100, 250, 500, 1000];
const MIN_AMOUNT = 20;
const MAX_AMOUNT = 200000;

type PayMethod = "upi" | "razorpay";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function AddFundsPage() {
  const [method, setMethod] = useState<PayMethod>("upi");
  const [amount, setAmount] = useState("");
  const [agreed, setAgreed] = useState(true);
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const submitStaticPayment = useServerFn(submitStaticUpiPayment);
  const startRazorpay = useServerFn(startRazorpayCheckout);
  const confirmRazorpay = useServerFn(confirmRazorpayPayment);
  const getQrCode = useServerFn(fetchStaticQrCode);

  // Load static QR code server-side details on mount
  const qrQuery = useQuery({
    queryKey: ["static-qr"],
    queryFn: () => getQrCode({}),
  });

  const fmt = useMemo(() => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }), []);
  const amt = Math.max(0, Number(amount) || 0);

  // Refresh user balance on mount
  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const amountError =
    amount !== "" && (amt < MIN_AMOUNT || amt > MAX_AMOUNT)
      ? `Enter an amount between ₹${MIN_AMOUNT} and ₹${fmt.format(MAX_AMOUNT)}`
      : "";

  const amountReady = !amountError && amt >= MIN_AMOUNT;
  const canSubmit = amountReady && agreed && utrNumber.trim().length >= 10 && !isSubmitting;

  const handleRazorpay = async () => {
    if (!amountReady || !agreed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok || !window.Razorpay) throw new Error("Could not load the payment window. Check your connection.");

      const session = await startRazorpay({ data: { amount: amt } });

      const rzp = new window.Razorpay({
        key: session.keyId,
        amount: Math.round(session.amount * 100),
        currency: "INR",
        name: "Intopsmm",
        description: `Wallet top-up of Rs ${session.amount}`,
        order_id: session.razorpayOrderId,
        theme: { color: "#10b981" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await confirmRazorpay({
              data: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            toast.success("Payment successful! Wallet credited.");
            setAmount("");
            await queryClient.invalidateQueries({ queryKey: ["my-topups"] });
            void refreshProfile();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Payment verification failed.");
          }
        },
        modal: { ondismiss: () => setIsSubmitting(false) },
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start the payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      await submitStaticPayment({
        data: {
          amount: amt,
          utrNumber: utrNumber.trim(),
        },
      });
      toast.success("⏳ Transaction submitted! Admin will verify and credit your wallet shortly.");
      setUtrNumber("");
      await queryClient.invalidateQueries({ queryKey: ["my-topups"] });
      void refreshProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardShell active="Add Funds">
      {/* Header Banner */}
      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              PhonePe QR Code & UTR Verification
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              ADD <span className="gradient-text">FUNDS</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan the QR code with PhonePe only, pay the amount, and submit the UTR number to get wallet credit.
            </p>
          </div>
          <span className="hidden h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg sm:grid">
            <Wallet className="h-9 w-9" />
          </span>
        </div>
      </Card>

      {/* Payment method switcher */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMethod("upi")}
          aria-pressed={method === "upi"}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
            method === "upi"
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-border/60 bg-secondary/40 hover:border-emerald-500/50"
          }`}
        >
          <QrCode className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="min-w-0">
            <span className="block text-sm font-bold">UPI QR + UTR</span>
            <span className="block text-xs text-muted-foreground">Pay by PhonePe QR, admin verifies</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMethod("razorpay")}
          aria-pressed={method === "razorpay"}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
            method === "razorpay"
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-border/60 bg-secondary/40 hover:border-emerald-500/50"
          }`}
        >
          <CreditCard className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="min-w-0">
            <span className="block text-sm font-bold">Razorpay (Instant)</span>
            <span className="block text-xs text-muted-foreground">UPI, cards, netbanking — auto credit</span>
          </span>
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: QR Code & Form */}
        <div className="space-y-6 lg:col-span-7">
          {method === "razorpay" ? (
            <Card className="glass border-border/60 p-6 shadow-card space-y-5">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <Zap className="h-5 w-5 text-emerald-400" /> Instant payment with Razorpay
              </h2>
              <p className="text-sm text-muted-foreground">
                Pay with any UPI app, debit/credit card or netbanking. Your wallet is credited automatically
                right after a successful payment — no UTR needed.
              </p>

              <div className="space-y-2">
                <Label htmlFor="rzp-amount" className="text-sm font-semibold">
                  Amount (Minimum ₹{MIN_AMOUNT})
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    id="rzp-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="Enter amount"
                    className="h-12 rounded-xl border-border/60 bg-background pl-9 text-lg font-bold tracking-wide"
                  />
                </div>
                {amountError && <p className="text-xs font-medium text-destructive">{amountError}</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(String(val))}
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                      amt === val
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm"
                        : "border-border/60 bg-secondary/40 text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                    }`}
                  >
                    ₹{fmt.format(val)}
                  </button>
                ))}
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  I agree that funds added will be used for SMM services and I will not raise fraudulent disputes.
                </span>
              </label>

              <Button
                type="button"
                variant="hero"
                onClick={handleRazorpay}
                disabled={!amountReady || !agreed || isSubmitting}
                className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening…</>
                ) : (
                  <><CreditCard className="mr-2 h-4 w-4" /> Pay ₹{amt > 0 ? fmt.format(amt) : "0"} securely</>
                )}
              </Button>
            </Card>
          ) : (
          <Card className="glass border-border/60 p-6 shadow-card space-y-6">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-400" /> Pay using UPI QR Code
            </h2>

            {/* Static QR Code Image — no border/circle, just the image */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {qrQuery.isLoading ? (
                <div className="flex h-[240px] w-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/30">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                </div>
              ) : qrQuery.data?.qrDataUrl ? (
                <img
                  src={qrQuery.data.qrDataUrl}
                  alt="Intopsmm Static UPI QR"
                  className="mx-auto w-full max-w-[280px] object-contain rounded-xl shadow-lg"
                />
              ) : (
                <p className="text-xs text-destructive">Failed to load QR code image.</p>
              )}

              <div className="w-full max-w-[320px] rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-center text-[11px] font-semibold leading-relaxed text-amber-400">
                𝗡𝗼𝘁𝗲- 𝗣𝗹𝗲𝗮𝘀𝗲 𝗽𝗮𝘆 𝘂𝘀𝗶𝗻𝗴 𝘁𝗵𝗶𝘀 𝗤𝗥 𝗰𝗼𝗱𝗲 𝗼𝗻𝗹𝘆 𝘄𝗶𝘁𝗵 𝗣𝗵𝗼𝗻𝗲𝗣𝗲. 𝗙𝗼𝗿 𝗼𝘁𝗵𝗲𝗿 𝗨𝗣𝗜 𝗮𝗽𝗽𝘀 𝘀𝗲𝗹𝗲𝗰𝘁 𝗮 𝗱𝗶𝗳𝗳𝗲𝗿𝗲𝗻𝘁 𝗽𝗮𝘆𝗺𝗲𝗻𝘁 𝗺𝗲𝘁𝗵𝗼𝗱.
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmit} className="border-t border-border/40 pt-5 space-y-4">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">
                  Amount Paid (Minimum ₹{MIN_AMOUNT})
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
                    className="h-12 rounded-xl border-border/60 bg-background pl-9 text-lg font-bold tracking-wide"
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
                    className={`rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                      amt === val
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm"
                        : "border-border/60 bg-secondary/40 text-muted-foreground hover:border-emerald-500/50 hover:text-foreground"
                    }`}
                  >
                    ₹{fmt.format(val)}
                  </button>
                ))}
              </div>

              {/* UTR Number */}
              <div className="space-y-2">
                <Label htmlFor="utr" className="text-sm font-semibold">
                  12-Digit UPI UTR / Ref Number
                </Label>
                <Input
                  id="utr"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                  placeholder="e.g. 423589123456"
                  maxLength={22}
                  className="h-12 rounded-xl border-border/60 bg-background text-base font-mono tracking-wider font-bold"
                />
              </div>

              {/* Policy Agreement */}
              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  I agree that funds added will be used for SMM services and I will not raise fraudulent disputes.
                </span>
              </label>

              {/* Submit */}
              <Button
                type="submit"
                variant="hero"
                className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit UTR for Wallet Credit</>
                )}
              </Button>
            </form>
          </Card>
          )}
        </div>

        {/* Right Column: Instructions Card */}
        <div className="space-y-6 lg:col-span-5">
          <Card className="glass border-border/60 p-5 shadow-card space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" /> How to Add Funds
            </h3>
            <ol className="space-y-3 text-xs text-muted-foreground">
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400 text-[11px]">1</span>
                <span><strong>Scan the QR Code</strong> with PhonePe only.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400 text-[11px]">2</span>
                <span><strong>Enter amount to pay</strong> (minimum ₹{MIN_AMOUNT}).</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400 text-[11px]">3</span>
                <span><strong>Include amount and Transaction ID</strong>, tick the Terms &amp; Condition box, and tap the pay button.</span>
              </li>
            </ol>
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-400 font-bold leading-relaxed text-center">
              Pay Minimum: ₹{MIN_AMOUNT}
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[11px] text-amber-400 font-medium leading-relaxed">
              ⚠️ Make sure to enter the correct UTR number. Wrong UTR submissions may result in delayed credit or account suspension.
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
