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
  Download,
  QrCode,
  CreditCard,
  Clock,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
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
          "Scan the 5-minute dynamic UPI QR code with your entered amount and top up your wallet instantly in INR.",
      },
      { property: "og:title", content: "Top Up Wallet — GrowthPanel" },
      { property: "og:description", content: "Enter an amount, scan the 5-min QR and pay with any UPI app." },
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

type ActiveQRSession = {
  paymentOrderId: string;
  gatewayOrderId: string;
  amount: number;
  qrDataUrl: string;
  upiIntentUrl?: string;
  expiresAt: number;
};

function AddFundsPage() {
  const [amount, setAmount] = useState("1");
  const [agreed, setAgreed] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveQRSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

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
  const canGenerate = amountReady && agreed && !isGenerating;

  // Handle countdown timer for active QR
  useEffect(() => {
    if (!activeSession || paymentSuccess) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((activeSession.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession, paymentSuccess]);

  // Poll for payment completion when QR session is active
  useEffect(() => {
    if (!activeSession || paymentSuccess || timeLeft <= 0) return;

    const pollTimer = setInterval(async () => {
      try {
        const res = await checkTopup({ data: { paymentOrderId: activeSession.paymentOrderId } });
        if (res.status === "paid") {
          setPaymentSuccess(true);
          toast.success(`🎉 Payment of ₹${fmt.format(activeSession.amount)} received successfully! Added to wallet.`);
          await queryClient.invalidateQueries();
          clearInterval(pollTimer);
        }
      } catch {
        // Continue polling
      }
    }, 2500);

    return () => clearInterval(pollTimer);
  }, [activeSession, paymentSuccess, timeLeft, checkTopup, queryClient, fmt]);

  // Generate dynamic QR code
  const handleGenerateQR = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setPaymentSuccess(false);

    try {
      const session = await startTopup({ data: { amount: amt } });
      setActiveSession(session);
      setTimeLeft(Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)));
      toast.success(`Dynamic QR generated for ₹${fmt.format(amt)}. Valid for 5 minutes.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  // Download QR code image
  const handleDownloadQR = () => {
    if (!activeSession?.qrDataUrl) return;
    const link = document.createElement("a");
    link.href = activeSession.qrDataUrl;
    link.download = `GrowMeSMM-QR-₹${activeSession.amount}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info("QR Code downloaded! Open PhonePe/GPay/Paytm to scan from gallery.");
  };

  // Copy UPI Intent link
  const handleCopyUPI = () => {
    if (!activeSession?.upiIntentUrl) return;
    navigator.clipboard.writeText(activeSession.upiIntentUrl);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
    toast.success("UPI link copied!");
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <DashboardShell active="Add Funds">
      {/* Header Banner */}
      <Card className="glass overflow-hidden border-border/60 shadow-card">
        <div className="grid gap-4 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-400">
              5-Minute Dynamic UPI QR
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              TOP UP <span className="gradient-text">WALLET</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the amount, generate a 5-minute dynamic UPI QR code, scan with any UPI app, and get credited
              instantly.
            </p>
          </div>
          <span className="hidden h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg sm:grid">
            <Wallet className="h-9 w-9" />
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Top-Up Controls & Dynamic QR */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="glass border-border/60 p-6 shadow-card">
            <div className="space-y-5">
              {/* Amount Selection */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">
                  Amount to Add (₹{MIN_AMOUNT} – ₹{fmt.format(MAX_AMOUNT)})
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
                  I agree that funds added will be used for SMM services and I will not raise fraudulent disputes.
                </span>
              </label>

              {/* Generate QR Button */}
              <Button
                variant="hero"
                className="h-14 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-base font-bold shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
                disabled={!canGenerate}
                onClick={handleGenerateQR}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating 5-Min Dynamic QR…
                  </>
                ) : (
                  <>
                    <QrCode className="mr-2 h-5 w-5" />
                    Generate Dynamic QR Code ({amountReady ? `₹${fmt.format(amt)}` : ""})
                  </>
                )}
              </Button>

              {/* Active Dynamic QR Display Card */}
              {activeSession && (
                <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-950/10 p-5 shadow-inner">
                  {paymentSuccess ? (
                    /* Success State */
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                        <CheckCircle2 className="h-10 w-10 animate-bounce" />
                      </div>
                      <h3 className="text-xl font-bold text-emerald-400">Payment Successful! 🎉</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ₹{fmt.format(activeSession.amount)} has been credited to your wallet instantly.
                      </p>
                      <Button
                        onClick={() => {
                          setActiveSession(null);
                          setPaymentSuccess(false);
                        }}
                        className="mt-4 rounded-xl bg-emerald-500 font-semibold text-white hover:bg-emerald-600"
                      >
                        Add More Funds
                      </Button>
                    </div>
                  ) : timeLeft <= 0 ? (
                    /* Expired State */
                    <div className="py-6 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20 text-destructive">
                        <XCircle className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-bold text-destructive">QR Code Expired</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This 5-minute QR code has expired for security. Please generate a new one.
                      </p>
                      <Button
                        onClick={handleGenerateQR}
                        className="mt-3 rounded-xl bg-primary text-primary-foreground"
                      >
                        <RefreshCw className="mr-1.5 h-4 w-4" /> Generate New QR
                      </Button>
                    </div>
                  ) : (
                    /* Active 5-Minute QR State */
                    <div className="text-center">
                      {/* Timer Badge */}
                      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-sm font-bold text-emerald-400">
                        <Clock className="h-4 w-4 animate-spin text-emerald-400" />
                        Expires in: <span className="font-mono text-base">{timeFormatted}</span>
                      </div>

                      {/* QR Image Box */}
                      <div className="mx-auto my-4 flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border-2 border-emerald-500/40 bg-white p-3 shadow-2xl">
                        <img
                          src={activeSession.qrDataUrl}
                          alt={`UPI QR for ₹${activeSession.amount}`}
                          className="h-full w-full object-contain"
                        />
                      </div>

                      {/* Amount Details */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Pay Exact Amount
                        </p>
                        <p className="text-2xl font-black text-foreground">₹{fmt.format(activeSession.amount)}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <Button
                          variant="outline"
                          onClick={handleDownloadQR}
                          className="h-11 rounded-xl border-border/80 text-xs font-bold"
                        >
                          <Download className="mr-1.5 h-4 w-4" /> Download QR
                        </Button>
                        {activeSession.upiIntentUrl ? (
                          <Button
                            asChild
                            className="h-11 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <a href={activeSession.upiIntentUrl}>
                              <ExternalLink className="mr-1.5 h-4 w-4" /> Pay via App
                            </a>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={handleCopyUPI}
                            className="h-11 rounded-xl border-border/80 text-xs font-bold"
                          >
                            {copiedUpi ? <Check className="mr-1.5 h-4 w-4 text-emerald-400" /> : <Copy className="mr-1.5 h-4 w-4" />}
                            {copiedUpi ? "Copied!" : "Copy Link"}
                          </Button>
                        )}
                      </div>

                      {/* Live Polling Status */}
                      <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-secondary/30 py-2 text-xs font-medium text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                        Waiting for payment... Auto-updates instantly
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Passbook & Payment Guide */}
        <div className="space-y-6 lg:col-span-5">
          {/* Instructions */}
          <Card className="glass border-border/60 p-5 shadow-card">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-4 w-4 text-emerald-400" /> How 5-Min Dynamic QR Works
            </h3>
            <ol className="mt-3 space-y-2.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400">
                  1
                </span>
                <span>Enter amount and click <strong>Generate Dynamic QR</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400">
                  2
                </span>
                <span>Open GPay, PhonePe, Paytm or BHIM UPI and scan the QR code (or download to scan from gallery).</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400">
                  3
                </span>
                <span>Complete the payment within <strong>5 minutes</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 font-bold text-emerald-400">
                  4
                </span>
                <span>Your wallet balance updates <strong>automatically without refreshing</strong>.</span>
              </li>
            </ol>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Direct 256-bit encrypted UPI instant payment gateway.
            </div>
          </Card>

          {/* Top-up History Passbook */}
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
