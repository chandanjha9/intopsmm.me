import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Wallet,
  Coins,
  ShoppingCart,
  ChevronDown,
  Zap,
  ShieldCheck,
  Droplets,
  Gauge,
  User,
  BadgeCheck,
  Globe2,
} from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { useAuth } from "@/hooks/use-auth";
import { formatInr } from "@/lib/providers/pricing";
import { listMyOrders, listServices, placeOrder } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "New Order — Intopsmm Dashboard" },
      {
        name: "description",
        content:
          "Place new SMM orders, track your wallet balance, success rate and total orders from your Intopsmm dashboard.",
      },
      { property: "og:title", content: "New Order — Intopsmm Dashboard" },
      { property: "og:description", content: "Place orders, track balance and manage campaigns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <DashboardShell active="New Order">
      <Card className="glass border-border/60 p-6 text-sm text-destructive">{error.message}</Card>
    </DashboardShell>
  ),
  notFoundComponent: () => (
    <DashboardShell active="New Order">
      <Card className="glass border-border/60 p-6">Nothing here.</Card>
    </DashboardShell>
  ),
});

type Service = {
  id: string;
  name: string;
  category: string | null;
  platform: string | null;
  description: string | null;
  selling_rate: number;
  min_quantity: number;
  max_quantity: number;
  refill_supported: boolean;
  cancel_supported: boolean;
};



const PlatformGlyph = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path d={d} />
  </svg>
);

const platforms = [
  { key: "All", bg: "bg-[#ef4444]", d: "M3 6h18v2H3V6Zm0 5h18v2H3v-2Zm0 5h18v2H3v-2Z" },
  {
    key: "Instagram",
    bg: "bg-[linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)]",
    d: "M12 2c2.7 0 3.1 0 4.1.1 1.1 0 1.8.2 2.4.5.7.2 1.2.6 1.7 1.1s.9 1 1.1 1.7c.3.6.4 1.3.5 2.4.1 1 .1 1.4.1 4.1s0 3.1-.1 4.1c0 1.1-.2 1.8-.5 2.4-.2.7-.6 1.2-1.1 1.7s-1 .9-1.7 1.1c-.6.3-1.3.4-2.4.5-1 .1-1.4.1-4.1.1s-3.1 0-4.1-.1c-1.1 0-1.8-.2-2.4-.5-.7-.2-1.2-.6-1.7-1.1s-.9-1-1.1-1.7c-.3-.6-.4-1.3-.5-2.4C2.1 15.1 2 14.7 2 12s0-3.1.1-4.1c0-1.1.2-1.8.5-2.4.2-.7.6-1.2 1.1-1.7s1-.9 1.7-1.1c.6-.3 1.3-.4 2.4-.5C8.9 2 9.3 2 12 2Zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.8 6.9a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z",
  },
  {
    key: "Youtube",
    bg: "bg-[#FF0000]",
    d: "M23 12s0-3.3-.4-4.9a2.6 2.6 0 0 0-1.8-1.8C19.1 4.9 12 4.9 12 4.9s-7.1 0-8.8.4A2.6 2.6 0 0 0 1.4 7.1C1 8.7 1 12 1 12s0 3.3.4 4.9a2.6 2.6 0 0 0 1.8 1.8c1.7.4 8.8.4 8.8.4s7.1 0 8.8-.4a2.6 2.6 0 0 0 1.8-1.8C23 15.3 23 12 23 12ZM9.8 15.2V8.8L15.5 12l-5.7 3.2Z",
  },
  {
    key: "Tiktok",
    bg: "bg-[#111111]",
    d: "M16.5 2h-3v13.1a2.6 2.6 0 1 1-2.2-2.6v-3a5.6 5.6 0 1 0 5.2 5.6V9.4a7 7 0 0 0 4 1.3v-3a4 4 0 0 1-4-4V2Z",
  },
  {
    key: "Telegram",
    bg: "bg-[#229ED9]",
    d: "M21.9 4.3 18.8 19c-.2 1-.9 1.3-1.7.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.4-4.9L18.2 6c.4-.3-.1-.5-.6-.2L6.5 12.6l-4.6-1.4c-1-.3-1-1 .2-1.5L20.6 2.6c.8-.3 1.5.2 1.3 1.7Z",
  },
  {
    key: "Whatsapp",
    bg: "bg-[#25D366]",
    d: "M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.4-1.1-2.7s.7-1.9.9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4-.1.7.5l.8 2c.1.2.1.4 0 .6l-.4.5c-.1.2-.3.3-.1.6.1.3.6 1.1 1.4 1.8 1 .9 1.8 1.1 2 1.2.3.1.4.1.6-.1l.8-.9c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.2.1.7-.1 1.3Z",
  },
  {
    key: "X",
    bg: "bg-[#111111]",
    d: "M17.5 3h3.1l-6.8 7.8L21.8 21h-6.2l-4.9-6.3L4.9 21H1.8l7.3-8.3L2.2 3h6.4l4.4 5.8L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z",
  },
];

function DashboardPage() {
  const { profile, user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const username = profile?.username ?? user?.email?.split("@")[0] ?? "member";

  const fetchServices = useServerFn(listServices);
  const fetchOrders = useServerFn(listMyOrders);
  const submitOrder = useServerFn(placeOrder);

  const { data: allServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      try {
        const res = await fetchServices();
        return Array.isArray(res) ? (res as Service[]) : [];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
  const { data: myOrders = [] } = useQuery({
    queryKey: ["my-orders"],
    queryFn: async () => {
      try {
        const res = await fetchOrders();
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 5_000,
  });

  // Auto-refresh profile balance every 5 seconds so refunds / top-ups immediately reflect
  useEffect(() => {
    const timer = setInterval(() => {
      void refreshProfile();
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshProfile]);

  const [platform, setPlatform] = useState("All");
  const [category, setCategory] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [quantity, setQuantity] = useState("1000");
  const [link, setLink] = useState("");

  const platformServices = useMemo(() => {
    const list = Array.isArray(allServices) ? allServices : [];
    return platform === "All"
      ? list
      : list.filter((item) =>
          (item?.platform ?? item?.category ?? "").toLowerCase().includes(platform.toLowerCase()),
        );
  }, [allServices, platform]);

  const categories = useMemo(
    () => Array.from(new Set(platformServices.map((item) => item?.category ?? "Other"))),
    [platformServices],
  );

  const activeCategory = categories.includes(category) ? category : (categories[0] ?? "");
  const categoryServices = useMemo(
    () => platformServices.filter((item) => (item?.category ?? "Other") === activeCategory),
    [platformServices, activeCategory],
  );
  const service =
    categoryServices.find((item) => item.id === serviceId) ?? categoryServices[0] ?? null;

  // Calculate Net Spent: subtract any refunded, canceled or failed orders
  const netSpent = myOrders
    .filter((order) => !["canceled", "refunded", "failed", "error"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.charge ?? 0), 0);

  const stats = [
    { label: "Username", value: username, Icon: User },
    {
      label: "Balance",
      value: `≈ ₹ ${(profile?.wallet_balance ?? 0).toFixed(4)}`,
      Icon: Wallet,
    },
    {
      label: "Success Rate",
      value: "93%",
      Icon: BadgeCheck,
    },
    { label: "Total Orders", value: (230826 + myOrders.length).toLocaleString("en-IN"), Icon: ShoppingCart },
    {
      label: "Spent Balance",
      value: formatInr(netSpent),
      Icon: Coins,
    },
  ];

  const qtyNum = Math.max(0, Number(quantity) || 0);
  const chargeValue = service ? (qtyNum / 1000) * Number(service.selling_rate) : 0;
  const charge = chargeValue.toLocaleString("en-IN", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

  const order = useMutation({
    mutationFn: () => {
      if (!service) throw new Error("Select a service first");
      return submitOrder({ data: { serviceId: service.id, link: link.trim(), quantity: qtyNum } });
    },
    onSuccess: () => {
      toast.success("Order placed", { description: "Track progress in Order History." });
      setLink("");
      void refreshProfile();
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["my-transactions"] });
    },
    onError: (error: Error) => toast.error("Order failed", { description: error.message }),
  });

  const canSubmit =
    Boolean(service) &&
    link.trim().length > 8 &&
    qtyNum >= (service?.min_quantity ?? 1) &&
    qtyNum <= (service?.max_quantity ?? 0) &&
    !order.isPending;




  return (
    <DashboardShell active="New Order">

          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((s) => (
              <Card key={s.label} className="glass border-border/60 p-4 shadow-card">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.Icon className="h-4.5 w-4.5" />
                </span>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-0.5 truncate text-lg font-bold tracking-tight">{s.value}</p>
              </Card>
            ))}
          </section>

          {/* Order composer */}
          <Card className="glass border-border/60 p-6 shadow-card">
            <h2 className="text-lg font-bold">New Order</h2>
            <p className="text-sm text-muted-foreground">Choose a Platform</p>

            <div className="mt-4 flex flex-wrap gap-3">
              {platforms.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    setPlatform(p.key);
                    setCategory("");
                    setServiceId("");
                  }}
                  title={p.key}
                  aria-label={p.key}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white transition ${p.bg} ${
                    platform === p.key ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <PlatformGlyph d={p.d} />
                </button>
              ))}
            </div>

            {servicesLoading && (
              <p className="mt-4 text-sm text-muted-foreground">Loading services…</p>
            )}
            {!servicesLoading && allServices.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No services are published yet. Please check back shortly.
              </p>
            )}

            {service && (
              <>
                <div className="mt-5 grid gap-4">
                  <Field label="Category">
                    <SelectPill
                      value={activeCategory}
                      onChange={(value) => {
                        setCategory(value);
                        setServiceId("");
                      }}
                      options={categories}
                    />
                  </Field>

                  <Field label="Service">
                    <SelectPill
                      value={`${service.name} — ${formatInr(Number(service.selling_rate))} per 1000`}
                      onChange={(value) => {
                        const match = categoryServices.find(
                          (item) => value.startsWith(item.name),
                        );
                        if (match) setServiceId(match.id);
                      }}
                      options={categoryServices.map(
                        (item) => `${item.name} — ${formatInr(Number(item.selling_rate))} per 1000`,
                      )}
                    />
                  </Field>
                </div>

                {/* Description */}
                <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">Description</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    <DescRow Icon={Zap} label="Start Time" value="0 - 10 Minutes" />
                    <DescRow
                      Icon={Gauge}
                      label="Quantity range"
                      value={`${service.min_quantity.toLocaleString("en-IN")} - ${service.max_quantity.toLocaleString("en-IN")}`}
                    />
                    <DescRow
                      Icon={ShieldCheck}
                      label="Refill"
                      value={service.refill_supported ? "Supported" : "Not available"}
                    />
                    <DescRow
                      Icon={Droplets}
                      label="Cancel"
                      value={service.cancel_supported ? "Supported" : "Not available"}
                    />
                    <DescRow Icon={BadgeCheck} label="Platform" value={service.platform ?? "Global"} />
                    <DescRow
                      Icon={Globe2}
                      label="More About Service"
                      value={service.description ?? "See service name for full details"}
                    />
                  </ul>
                </div>

                <div className="mt-4 grid gap-4">
                  <Field label="Link">
                    <Input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://instagram.com/yourhandle"
                      maxLength={500}
                      className="h-11 rounded-xl border-border/60 bg-background"
                    />
                  </Field>
                  <Field label="Quantity">
                    <Input
                      inputMode="numeric"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
                      className="h-11 rounded-xl border-border/60 bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Min: {service.min_quantity.toLocaleString("en-IN")} - Max:{" "}
                      {service.max_quantity.toLocaleString("en-IN")}
                    </p>
                  </Field>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Charge</p>
                    <p className="text-2xl font-bold">₹{charge}</p>
                  </div>
                  <Button
                    variant="hero"
                    className="min-w-40"
                    disabled={!canSubmit}
                    onClick={() => order.mutate()}
                  >
                    {order.isPending ? "Placing…" : "Submit"}
                  </Button>
                </div>
              </>
            )}

          </Card>

          {/* How orders work */}
          <Card className="glass border-border/60 p-6 shadow-card">
            <h3 className="text-base font-bold">How Orders Work</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When you place an order, it will move through the following statuses:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-semibold text-foreground">• Pending / Processing:</span> Your order has been
                received and queued. It will start within the estimated start time mentioned in the service
                description.
              </li>
              <li>
                <span className="font-semibold text-foreground">• In Progress:</span> Delivery has started, and the
                ordered quantity is being delivered gradually.
              </li>
              <li>
                <span className="font-semibold text-foreground">• Completed:</span> The full quantity of your order
                has been delivered successfully.
              </li>
              <li>
                <span className="font-semibold text-foreground">• Partial:</span> Only part of the order was
                delivered. The remaining amount is automatically refunded to your account balance.
              </li>
              <li>
                <span className="font-semibold text-foreground">• Canceled:</span> The order could not be completed
                and has been fully refunded to your balance.
              </li>
            </ul>

            <h3 className="mt-6 text-base font-bold">Important Usage Rules</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                • Do not place the same order on the same link or account from another panel while an order is
                already in progress on that link. If delivery is completed or affected by another panel, the order
                will not be eligible for refund or refill.
              </li>
              <li>
                • Do not place a new order on the same link before the previous order is completed or refilled.
                Doing so may cause incorrect counts, and the order may become ineligible for refill or refund.
              </li>
              <li>
                • Changing the username or link after placing an order may cause the order to be marked as
                completed. In such cases, the order will not be eligible for refund or refill.
              </li>
            </ul>

            <h3 className="mt-6 text-base font-bold">Refill Policy</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li>
                • Refill is available only for services that include refill support, as clearly mentioned in the
                service description.
              </li>
              <li>• Refill eligibility is calculated using the rule: Start Count + Ordered Quantity.</li>
              <li>• We never calculate refill using Quantity + Quantity.</li>
              <li>
                • Example: If your order has a final count of 5,000 and the count drops, you must request a refill
                before placing a new order.
              </li>
            </ul>
          </Card>
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SelectPill({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-border/60 bg-background px-3 text-left text-sm hover:border-primary/40"
      >
        <span className="truncate">{value}</span>
        <ChevronDown className={`ml-auto h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border/60 bg-popover shadow-lg">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-secondary ${
                opt === value ? "bg-secondary font-medium" : ""
              }`}
            >
              <span className="truncate">{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DescRow({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-background/70 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="truncate text-sm font-medium">{value}</span>
    </li>
  );
}
