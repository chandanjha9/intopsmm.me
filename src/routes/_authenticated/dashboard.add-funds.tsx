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
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  QrCode,
  Clock,
  RefreshCw,
  Sparkles,
  ExternalLink,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { submitStaticUpiPayment, fetchStaticQrCode, listMyTopups } from "@/lib/payments.functions";
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

const QUICK_AMOUNTS = [15, 50, 100, 250, 500, 1000];
const MIN_AMOUNT = 15;
const MAX_AMOUNT = 200000;

function AddFundsPage() {
  const [amount, setAmount] = useState("15");
  const [agreed, setAgreed] = useState(true);
  const [utrNumber, setUtrNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);

  const { refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  
  const fetchTopups = useServerFn(listMyTopups);
  const submitStaticPayment = useServerFn(submitStaticUpiPayment);
  const getQrCode = useServerFn(fetchStaticQrCode);

  const fmt = useMemo(() => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }), []);
  const amt = Math.max(0, Number(amount) || 0);

  // Load static QR code server-side details on mount
  const qrQuery = useQuery({
    queryKey: ["static-qr"],
    queryFn: () => getQrCode({}),
  });

  // Query submissions history (Poll every 5 seconds for status changes)
  const topups = useQuery({
    queryKey: ["my-topups"],
    queryFn: () => fetchTopups({}),
    refetchInterval: 5000,
  });

  // Refresh user balance on mount
  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  // Balance changes will trigger a profile refresh immediately
  const lastPaidCount = useMemo(() => {
    return topups.data?.filter(t => t.status === "paid").length ?? 0;
  }, [topups.data]);

  useEffect(() => {
    if (lastPaidCount > 0) {
      void refreshProfile();
    }
  }, [lastPaidCount, refreshProfile]);

  const amountError =
    amount !== "" && (amt < MIN_AMOUNT || amt > MAX_AMOUNT)
      ? `Enter an amount between ₹${MIN_AMOUNT} and ₹${fmt.format(MAX_AMOUNT)}`
      : "";

  const amountReady = !amountError && amt >= MIN_AMOUNT;
  const canSubmit = amountReady && agreed && utrNumber.trim().length >= 10 && !isSubmitting;

  const handleCopyVpa = () => {
    const vpa = qrQuery.data?.upiVpa;
    if (!vpa) return;
    void navigator.clipboard.writeText(vpa);
    setCopiedVpa(true);
    toast.success("UPI ID copied! Open PhonePe/GPay/Paytm and send to this UPI ID.");
    setTimeout(() => setCopiedVpa(false), 3000);
  };

  const handleDownloadQR = () => {
    const url = qrQuery.data?.qrDataUrl;
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `Intopsmm-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.info("QR Code downloaded!");
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
      toast.success("⏳ Transaction submitted successfully! Admin will verify and credit your wallet shortly.");
      setUtrNumber("");
      await queryClient.invalidateQueries({ queryKey: ["my-topups"] });
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
              UPI QR Code & UTR Verification
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              ADD <span className="gradient-text">FUNDS</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan the UPI QR code below, pay the amount, and submit the 12-digit UPI UTR number to get wallet credit.
            </p>
          </div>
          <span className="hidden h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg sm:grid">
            <Wallet className="h-9 w-9" />
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: QR Code & Form */}
        <div className="space-y-6 lg:col-span-7">
          <Card className="glass border-border/60 p-6 shadow-card space-y-6">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-400" /> Pay using UPI QR Code
            </h2>

            {/* Static QR Code Image Display */}
            <div className="flex flex-col items-center justify-center space-y-4">
              {qrQuery.isLoading ? (
                <div className="flex h-[240px] w-[240px] items-center justify-center rounded-2xl border-2 border-dashed border-emerald-500/30">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                </div>
              ) : qrQuery.data?.qrDataUrl ? (
                <div className="mx-auto flex aspect-square w-full max-w-[240px] items-center justify-center rounded-2xl border-2 border-emerald-500/40 bg-white p-3 shadow-2xl">
                  <img
                    src={qrQuery.data.qrDataUrl}
                    alt="Intopsmm Static UPI QR"
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <p className="text-xs text-destructive">Failed to load QR code image.</p>
              )}

              {/* Copy UPI ID Box */}
              {!qrQuery.isLoading && qrQuery.data && (
                <div className="w-full max-w-md flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] font-bold text-emerald-400">UPI ID / VPA</p>
                    <p className="truncate font-mono text-sm font-bold text-foreground">{qrQuery.data.upiVpa}</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCopyVpa}
                    className="h-9 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition shadow-sm"
                  >
                    {copiedVpa ? (
                      <>
                        <Check className="mr-1 h-3.5 w-3.5" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3.5 w-3.5" /> Copy ID
                      </>
                    )}
                  </Button>
                </div>
              )}

              {!qrQuery.isLoading && qrQuery.data && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadQR}
                  className="rounded-lg border-border/85"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Download QR Code
                </Button>
              )}
            </div>

            {/* Instruction list right below QR */}
            <div className="border-t border-border/40 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Payment Instructions
              </h3>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-400">1.</span>
                  <span>Scan the UPI QR Code with any UPI app (GPay, PhonePe, Paytm, BHIM, etc).</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-400">2.</span>
                  <span>Enter the amount you wish to add and complete the transaction.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-400">3.</span>
                  <span>Go to the transaction history/receipt of your payment app and copy the <strong>12-digit UPI Transaction ID / UTR Number</strong>.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-emerald-400">4.</span>
                  <span>Enter the exact Amount paid and the copied UTR Number below to submit verification.</span>
                </li>
              </ul>
            </div>

            {/* Payment Input Form */}
            <form onSubmit={handleSubmit} className="border-t border-border/40 pt-5 space-y-4">
              {/* Amount Selection */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-semibold">
                  Amount Paid (₹{MIN_AMOUNT} – ₹{fmt.format(MAX_AMOUNT)})
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

              {/* UTR Input Field */}
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

              {/* Agreement */}
              <label className="flex cursor-pointer items-start gap-2.5 text-xs text-muted-foreground">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>
                  I agree that funds added will be used for SMM services and I will not raise fraudulent disputes.
                </span>
              </label>

              {/* Submit UTR Verification Button */}
              <Button
                type="submit"
                variant="hero"
                className="h-12 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-sm font-bold shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
                disabled={!canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Submission…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Submit UTR for Wallet Credit
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Passbook & Payment Guide */}
        <div className="space-y-6 lg:col-span-5">
          {/* Security details */}
          <Card className="glass border-border/60 p-5 shadow-card space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Gateway Security
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every transaction submitted is cross-verified automatically with our bank node using the 12-digit transaction ID. Wallet balances are credited immediately upon automated verification. Fake submissions will lock the user account.
            </p>
          </Card>

          {/* Submissions/Add Funds Transaction History */}
          <Card className="glass border-border/60 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Transaction History</h2>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["my-topups"] })}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-4 space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {topups.isLoading && <p className="text-xs text-muted-foreground">Loading passbook…</p>}
              
              {!topups.isLoading && (topups.data?.length ?? 0) === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">No recent transactions.</p>
              )}
              
              {topups.data?.map((p) => {
                let statusBadge = null;
                if (p.status === "paid") {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Successfully Added Amount
                    </span>
                  );
                } else if (p.status === "under_review") {
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400">
                      <Clock className="h-3.5 w-3.5 text-amber-400 animate-pulse" /> Verification Pending
                    </span>
                  );
                } else {
                  // failed, rejected, canceled
                  statusBadge = (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive">
                      <XCircle className="h-3.5 w-3.5" /> Transaction Failed
                    </span>
                  );
                }

                return (
                  <div
                    key={p.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold font-mono">UTR: {p.gateway_payment_id || "N/A"}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(p.created_at).toLocaleString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                        ₹{fmt.format(Number(p.amount))}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs mt-1 border-t border-border/20 pt-1.5">
                      <div className="flex items-center justify-between">
                        {statusBadge}
                      </div>
                      {p.error_message && (
                        <p className="text-[10px] text-destructive font-medium italic mt-0.5">
                          Reason: {p.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
