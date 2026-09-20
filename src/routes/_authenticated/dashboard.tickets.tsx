import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  // Tickets query
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

  // Filtered tickets
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
      toast.error("Please enter at least one Order ID for refill or speed up.");
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

      toast.success(`Ticket #${res.ticket.ticketNumber} created! AI responded.`);
      setOrderIds("");
      setAdditionalInfo("");

      // Update tickets list cache
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Raise <span className="gradient-text">Ticket</span> & AI Support
            </h1>
            <p className="text-sm text-muted-foreground">
              Automated AI verification for drops, instant speed-up queueing, and direct 24/7 billing support.
            </p>
          </div>
        </div>

        {/* Dual Pane Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Submit Request Form */}
          <div className="lg:col-span-7 space-y-6">
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

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Select Request Type */}
                <div className="space-y-3">
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

                {/* Order IDs */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <Label htmlFor="order-ids" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Order IDs {selectedType === "refill" || selectedType === "speed_up" ? <span className="text-destructive">*</span> : "(Optional)"}
                    </Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    You can submit multiple Order IDs separated by commas. Example: <span className="font-mono text-foreground/80">14302193, 14302192, 14302191</span>
                  </p>
                  <Input
                    id="order-ids"
                    value={orderIds}
                    onChange={(e) => setOrderIds(e.target.value)}
                    placeholder="Enter Order ID(s) for refill or speed up"
                    className="h-11 text-sm bg-background/50 border-border/80"
                    required={selectedType === "refill" || selectedType === "speed_up"}
                  />
                </div>

                {/* Additional info */}
                <div className="space-y-1.5">
                  <Label htmlFor="additional-info" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Additional info
                  </Label>
                  <textarea
                    id="additional-info"
                    rows={4}
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
            </Card>
          </div>

          {/* Right Column: Your Tickets list & Active AI Conversation */}
          <div className="lg:col-span-5 space-y-4">
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
                    Select a request type on the left to submit your first ticket.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredTickets.map((t) => {
                    const isSelected = activeTicketId === t.id;
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
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-primary/80 bg-primary/10 ring-1 ring-primary/30"
                            : "border-border/60 bg-card hover:border-border hover:bg-muted/20"
                        }`}
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

            {/* Interactive AI Chat & Ticket Details View */}
            {activeTicketId && activeTicketData && (
              <Card className="glass border-primary/30 p-5 shadow-card space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        Ticket #{activeTicketData.ticket.ticketNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {activeTicketData.ticket.subject}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Created: {new Date(activeTicketData.ticket.createdAt).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setActiveTicketId(null)}
                  >
                    Close
                  </Button>
                </div>

                {/* Conversation message stream */}
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {activeTicketData.messages.map((m) => {
                    const isUser = m.senderType === "user";
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        {!isUser && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isUser
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-card border border-border/80 text-foreground rounded-tl-none whitespace-pre-line"
                          }`}
                        >
                          <div className="font-semibold text-[10px] mb-1 opacity-75">
                            {isUser ? "You" : "🤖 Intopsmm AI Support"}
                          </div>
                          <div>{m.message}</div>
                        </div>
                        {isUser && (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs">
                            <User className="h-4 w-4" />
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
                    placeholder="Type your reply to AI Support..."
                    className="h-9 text-xs bg-background/50 border-border/80"
                    disabled={isReplying}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isReplying || !replyText.trim()}
                    className="h-9 px-3.5 text-xs font-semibold"
                  >
                    {isReplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  </Button>
                </form>

                {/* Direct WhatsApp escalation banner */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💬</span>
                    <span className="text-muted-foreground text-[11px]">
                      Need live human manager? Chat on WhatsApp.
                    </span>
                  </div>
                  <a
                    href={`${SITE_CONTACT.whatsappLink}?text=${encodeURIComponent(
                      `Hi Intopsmm! Inquiring about Ticket #${activeTicketData.ticket.ticketNumber} (${activeTicketData.ticket.subject})`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline text-[11px]"
                  >
                    Open WhatsApp <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
