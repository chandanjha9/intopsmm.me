import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Zap,
  CreditCard,
  MessageCircle,
  Search,
  CheckCircle2,
  Bot,
  User,
  ExternalLink,
  Send,
  Loader2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Headphones,
} from "lucide-react";
import {
  createTicketServerFn,
  listMyTicketsServerFn,
  getTicketDetailsServerFn,
  sendTicketReplyServerFn,
} from "@/lib/tickets.functions";
import type { TicketType, TicketSummary, TicketMessage } from "@/lib/tickets.server";
import { SITE_CONTACT } from "@/data/site-contact";

export const Route = createFileRoute("/_authenticated/dashboard/tickets")({
  head: () => ({
    meta: [
      { title: "Raise Ticket & AI Support — Intopsmm Dashboard" },
      {
        name: "description",
        content: "Automated AI chatbot support for instant order refill, speed up, payment verification and 24/7 ticket resolution.",
      },
      { property: "og:title", content: "Raise Ticket — Intopsmm" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RaiseTicketPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="Raise Ticket">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
});

const requestTypes: Array<{
  type: TicketType;
  title: string;
  desc: string;
  icon: typeof RefreshCw;
}> = [
  {
    type: "refill",
    title: "Refill Order",
    desc: "Drop detected? Get your order refilled automatically.",
    icon: RefreshCw,
  },
  {
    type: "speed_up",
    title: "Speed Up",
    desc: "Order moving too slow? Push it to the speed up queue.",
    icon: Zap,
  },
  {
    type: "payment",
    title: "Payment",
    desc: "Payment issue or missing balance? Let us know.",
    icon: CreditCard,
  },
  {
    type: "other",
    title: "Other",
    desc: "Something else? Reach out and we'll help you out.",
    icon: MessageCircle,
  },
];

function WhatsAppSupportBox({ type }: { type: "payment" | "other" }) {
  const isPayment = type === "payment";
  const title = isPayment ? "Payment Support" : "Support Inquiries";
  const bodyText = isPayment
    ? "For payment-related issues, please reach out to our support team directly on WhatsApp. Share your transaction details and we'll resolve it as fast as possible."
    : "For custom requests, account inquiries, or general support, please reach out to our support team directly on WhatsApp. Share your details and we'll help you out as fast as possible.";

  const waUrl = `${SITE_CONTACT.whatsappLink}?text=${encodeURIComponent(
    isPayment
      ? "Hi Intopsmm Support! I need assistance regarding a payment issue."
      : "Hi Intopsmm Support! I have an inquiry."
  )}`;

  return (
    <div className="rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/[0.04] p-5 sm:p-6 space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-sm">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
            <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4-.1.7.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3Z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">{title}</h3>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Handled by our support team
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-card/90 p-4 text-xs text-foreground/90 leading-relaxed shadow-sm">
        {bodyText}
      </div>

      <a
        href={waUrl}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white py-3.5 font-bold text-sm shadow-md transition-all active:scale-[0.99] cursor-pointer"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4-.1.7.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3Z" />
        </svg>
        Chat on WhatsApp
      </a>

      <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
        <Zap className="h-3.5 w-3.5 fill-current text-amber-500" />
        Typical response time: 5–15 minutes
      </div>
    </div>
  );
}

function RaiseTicketPage() {
  const queryClient = useQueryClient();
  const fetchTickets = useServerFn(listMyTicketsServerFn);
  const submitTicket = useServerFn(createTicketServerFn);
  const fetchDetails = useServerFn(getTicketDetailsServerFn);
  const sendReply = useServerFn(sendTicketReplyServerFn);

  const [selectedType, setSelectedType] = useState<TicketType>("refill");
  const [orderIds, setOrderIds] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Tickets list
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      try {
        const res = await fetchTickets();
        return Array.isArray(res) ? (res as TicketSummary[]) : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 10_000,
  });

  // Active Ticket Details query
  const { data: activeTicketData, isLoading: activeLoading } = useQuery({
    queryKey: ["support-ticket-detail", activeTicketId],
    enabled: Boolean(activeTicketId),
    queryFn: async () => {
      if (!activeTicketId) return null;
      try {
        const res = await fetchDetails({ data: { ticketId: activeTicketId } });
        return res as { ticket: TicketSummary; messages: TicketMessage[] } | null;
      } catch {
        return null;
      }
    },
    refetchInterval: 6_000,
  });

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      `#${t.ticketNumber}`.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      (t.orderIds ?? "").toLowerCase().includes(q) ||
      t.requestType.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((selectedType === "refill" || selectedType === "speed_up") && !orderIds.trim()) {
      toast.error("Please enter your Order ID.");
      return;
    }

    setIsSubmitting(true);
    setIsAiThinking(true);

    try {
      const res = await submitTicket({
        data: {
          requestType: selectedType,
          orderIds: orderIds.trim() || undefined,
          additionalInfo: additionalInfo.trim() || undefined,
        },
      });

      toast.success(`Ticket #${res.ticket.ticketNumber} created!`);
      setOrderIds("");
      setAdditionalInfo("");

      await queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setActiveTicketId(res.ticket.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit ticket");
    } finally {
      setIsSubmitting(false);
      setIsAiThinking(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketId) return;

    setIsReplying(true);
    try {
      await sendReply({
        data: {
          ticketId: activeTicketId,
          message: replyText.trim(),
        },
      });
      setReplyText("");
      await queryClient.invalidateQueries({ queryKey: ["support-ticket-detail", activeTicketId] });
      toast.success("Reply sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <DashboardShell active="Raise Ticket">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Raise <span className="gradient-text">Ticket</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Automated AI verification for drops, instant speed-up queueing, and WhatsApp support.
            </p>
          </div>
        </div>

        {/* Dual Pane Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Submit Request Form */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="glass border-border/60 p-6 shadow-card">
              {/* Form Title */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold">Submit Request</h2>
              </div>

              {/* How this works box */}
              <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-primary text-[11px]">
                  <HelpCircle className="h-3.5 w-3.5" />
                  How this works
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-primary font-bold">⚡</span>
                  <div>
                    <strong className="text-foreground">Refill & Speed Up — fully automated:</strong> Submit your Order ID and our AI will verify the order and handle your request instantly, no manual review needed.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">💬</span>
                  <div>
                    <strong className="text-foreground">Payments & other inquiries — via WhatsApp:</strong> For payments, cancellations, or any other issue, contact our support team directly on WhatsApp for a fast response.
                  </div>
                </div>
              </div>

              {/* Request Type Selector */}
              <div className="space-y-3 mb-6">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Please select your request type
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {requestTypes.map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setSelectedType(item.type)}
                        className={`relative flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
                            : "border-border/60 bg-card hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1.5">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-7 w-7 items-center justify-center rounded-md ${
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-sm font-semibold text-foreground">
                              {item.title}
                            </span>
                          </div>
                          <div
                            className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* DYNAMIC FORM SWITCHER: */}
              {selectedType === "payment" || selectedType === "other" ? (
                /* WhatsApp Card for Payment & Other (Matching Screenshot 1) */
                <WhatsAppSupportBox type={selectedType} />
              ) : (
                /* Order IDs Form for Refill & Speed Up */
                <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
                  {/* Order IDs */}
                  <div className="space-y-1.5">
                    <Label htmlFor="order-ids" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Order IDs <span className="text-destructive">*</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      You can submit multiple Order IDs separated by commas. Example: <span className="font-mono text-foreground/80">14302193, 14302192, 14302191</span>
                    </p>
                    <Input
                      id="order-ids"
                      value={orderIds}
                      onChange={(e) => setOrderIds(e.target.value)}
                      placeholder="Enter Order ID(s) for refill or speed up"
                      className="h-11 text-sm bg-background/50 border-border/80"
                      required
                    />
                  </div>

                  {/* Additional info */}
                  <div className="space-y-1.5">
                    <Label htmlFor="additional-info" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Additional info
                    </Label>
                    <textarea
                      id="additional-info"
                      rows={3}
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="Optional: Add any additional details about your request if needed."
                      className="w-full rounded-md border border-border/80 bg-background/50 p-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                    />
                  </div>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || isAiThinking}
                    className="h-11 px-8 text-sm font-semibold rounded-lg shadow-glow hover:opacity-90"
                  >
                    {isSubmitting || isAiThinking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        AI Verifying Order...
                      </>
                    ) : (
                      "Submit ticket"
                    )}
                  </Button>
                </form>
              )}
            </Card>
          </div>

          {/* Right Column: Your Tickets List OR Active AI Assistant View */}
          <div className="lg:col-span-6 space-y-4">
            {activeTicketId && activeTicketData ? (
              /* Active Chat Assistant View (Matching Screenshot 2 & 3) */
              <Card className="glass border-border/70 p-5 shadow-card space-y-4 animate-in fade-in duration-200">
                {/* Header: <- REFILL ASSISTANT / SPEED UP ASSISTANT */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTicketId(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted text-foreground transition-colors cursor-pointer"
                      title="Back to Tickets"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#E11D48] text-white shadow-sm">
                      <Headphones className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {activeTicketData.ticket.requestType === "refill"
                          ? "REFILL ASSISTANT"
                          : activeTicketData.ticket.requestType === "speed_up"
                          ? "SPEED UP ASSISTANT"
                          : "AI SUPPORT ASSISTANT"}
                      </h3>
                      <p className="text-[10px] text-muted-foreground">Ticket #{activeTicketData.ticket.ticketNumber}</p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setActiveTicketId(null)}
                  >
                    View all tickets
                  </Button>
                </div>

                {/* Centered Date Separator */}
                <div className="flex justify-center my-1">
                  <span className="rounded-full bg-muted/60 px-3 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {new Date(activeTicketData.ticket.createdAt).toISOString().slice(0, 10)}
                  </span>
                </div>

                {/* Conversation Stream */}
                <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                  {activeTicketData.messages.map((m) => {
                    const isUser = m.senderType === "user";
                    const timeStr = new Date(m.createdAt).toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    // Parse metadata if bot message
                    let meta: Record<string, unknown> | null = null;
                    if (!isUser && m.metadataJson) {
                      try {
                        meta = JSON.parse(m.metadataJson);
                      } catch {}
                    }

                    if (isUser) {
                      return (
                        <div key={m.id} className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-muted-foreground pr-1">{timeStr}</span>
                          <div className="rounded-2xl bg-[#E11D48] text-white px-4 py-2.5 text-xs font-semibold shadow-sm max-w-[90%] sm:max-w-[80%]">
                            {m.message}
                          </div>
                        </div>
                      );
                    }

                    // BOT RESPONSE
                    return (
                      <div key={m.id} className="flex flex-col items-start gap-1">
                        <span className="text-[10px] text-muted-foreground pl-1">{timeStr}</span>

                        {meta?.type === "refill" ? (
                          /* REFILL STRUCTURED CARD (MATCHING SCREENSHOT 3) */
                          <div className="w-full max-w-xl rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm space-y-4">
                            {/* Card Top Branding */}
                            <div className="flex items-center justify-between border-b border-border/60 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                                  I
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-foreground">Intopsmm</h4>
                                  <p className="text-[10px] text-muted-foreground">Automated Refill System</p>
                                </div>
                              </div>
                              <div className="text-right text-[11px] text-muted-foreground">
                                <div className="font-bold text-foreground">#{activeTicketData.ticket.ticketNumber}</div>
                                <div className="text-[10px]">
                                  {new Date(activeTicketData.ticket.createdAt).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Section Title */}
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                REFILL REQUEST REVIEW
                              </div>
                              <div className="text-sm font-bold text-foreground mt-0.5">
                                Your refill request has been reviewed
                              </div>
                            </div>

                            {/* 3 Metric Counters */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-3">
                              <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 sm:p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  ELIGIBLE
                                </div>
                                <div className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-0.5">
                                  {(meta.eligibleCount as number) ?? 1}
                                </div>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 sm:p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  NOT ELIGIBLE
                                </div>
                                <div className="text-lg sm:text-xl font-extrabold text-muted-foreground mt-0.5">
                                  {(meta.notEligibleCount as number) ?? 0}
                                </div>
                              </div>
                              <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5 sm:p-3">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  COOLDOWN
                                </div>
                                <div className="text-lg sm:text-xl font-extrabold text-muted-foreground mt-0.5">
                                  {(meta.cooldownCount as number) ?? 0}
                                </div>
                              </div>
                            </div>

                            {/* Order Details Sub-Card */}
                            <div className="rounded-xl border border-border/80 bg-background/50 p-3.5 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                                  ✓ ELIGIBLE
                                </span>
                                <span className="text-[11px] text-muted-foreground">1 order</span>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-bold text-foreground">
                                  #{String(meta.orderId || "14441897")}
                                </span>
                                <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-bold text-purple-600">
                                  {String(meta.platform || "Instagram")}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {String(meta.serviceName || "Instagram Followers")}
                              </div>

                              {/* 4 Stats Grid */}
                              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50 text-center">
                                <div>
                                  <div className="text-[10px] font-semibold text-muted-foreground">START</div>
                                  <div className="text-xs font-bold text-foreground mt-0.5">
                                    {Number(meta.startCount || 1730).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold text-muted-foreground">FINAL</div>
                                  <div className="text-xs font-bold text-foreground mt-0.5">
                                    {Number(meta.finalCount || 11730).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold text-muted-foreground">CURRENT</div>
                                  <div className="text-xs font-bold text-foreground mt-0.5">
                                    {Number(meta.currentCount || 7323).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold text-muted-foreground">DROP</div>
                                  <div className="text-xs font-bold text-destructive mt-0.5">
                                    {Number(meta.dropCount || -4407).toLocaleString()}
                                  </div>
                                </div>
                              </div>

                              {/* Status */}
                              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  STATUS
                                </span>
                                <span className="text-xs font-semibold text-emerald-600">
                                  {String(meta.status || "Forwarded to refill queue")}
                                </span>
                              </div>
                            </div>

                            {/* Bottom Green Notice Box */}
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-950 dark:text-emerald-300 leading-relaxed">
                              Your eligible orders are now in our refill queue. We'll process them as soon as possible and notify you here once complete. If you don't hear back within 48 hours, reply to this ticket.
                            </div>
                          </div>
                        ) : meta?.type === "speed_up" ? (
                          /* SPEED UP BOT CARD (MATCHING SCREENSHOT 2) */
                          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-4 sm:p-5 text-xs text-foreground shadow-sm space-y-3 leading-relaxed">
                            <p>Hi! We checked your speed up request.</p>
                            <p className="font-medium text-foreground">
                              {String(meta.statusMessage || m.message)}
                            </p>
                            <p className="text-muted-foreground">
                              If you are experiencing a different issue with this order, please reply here and our team will look into it for you.
                            </p>
                            <div className="text-[11px] font-medium text-muted-foreground pt-1">
                              Chloe
                            </div>
                          </div>
                        ) : (
                          /* General Bot Card */
                          <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-4 text-xs text-foreground shadow-sm space-y-2 whitespace-pre-line leading-relaxed">
                            {m.message}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-border/60">
                  <Input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Reply to this ticket..."
                    className="h-9 text-xs bg-background/50 border-border/80"
                    disabled={isReplying}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isReplying || !replyText.trim()}
                    className="h-9 px-4 text-xs font-semibold"
                  >
                    {isReplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </form>
              </Card>
            ) : (
              /* Tickets List View */
              <Card className="glass border-border/60 p-5 shadow-card">
                {/* Header with Search */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <h2 className="text-base font-bold">Your Tickets</h2>
                  </div>
                  <div className="relative w-40 sm:w-48">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="h-8 pl-8 text-xs bg-background/50 border-border/80"
                    />
                  </div>
                </div>

                {/* Tickets List */}
                {ticketsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs">Loading tickets...</span>
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
                    <MessageCircle className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-semibold">No tickets found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select Refill or Speed Up on the left to submit your first ticket.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                    {filteredTickets.map((t) => {
                      const dateStr = new Date(t.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTicketId(t.id)}
                          className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/60 hover:bg-muted/20 transition-all cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">
                                #{t.ticketNumber} — {t.subject}
                              </span>
                              {t.hasUnread && (
                                <span className="rounded bg-destructive px-1.5 py-0.2 text-[9px] font-bold text-destructive-foreground uppercase tracking-wider">
                                  Unread
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                                t.status === "responded"
                                  ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                  : t.status === "in_progress"
                                  ? "bg-sky-500/15 text-sky-600 border-sky-500/30"
                                  : "bg-muted text-muted-foreground border-border"
                              }`}
                            >
                              {t.status === "responded" ? "Responded" : t.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {dateStr}
                            </span>
                            <span className="flex items-center gap-0.5 text-primary text-xs font-medium">
                              View chat <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
