import { useState, useEffect } from "react";
import { Wrench, ShieldCheck, RefreshCw, MessageSquare, Clock, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaintenanceGame } from "./MaintenanceGame";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMaintenanceStatus } from "@/lib/maintenance.functions";
import { toast } from "sonner";

interface MaintenanceScreenProps {
  message?: string;
  estimatedTime?: string;
  onAdminBypass?: () => void;
}

export function MaintenanceScreen({
  message: initialMessage,
  estimatedTime: initialEstimatedTime,
  onAdminBypass,
}: MaintenanceScreenProps) {
  const checkStatusFn = useServerFn(getMaintenanceStatus);
  const [isChecking, setIsChecking] = useState(false);
  const [bypassInput, setBypassInput] = useState("");
  const [showAdminBypass, setShowAdminBypass] = useState(false);

  // Poll server every 10s to see if maintenance ended
  const { data: status } = useQuery({
    queryKey: ["maintenance-poll-status"],
    queryFn: async () => {
      const res = await checkStatusFn();
      // If maintenance ended, automatically reload to live site!
      if (!res?.isMaintenance && typeof window !== "undefined") {
        toast.success("Maintenance complete! Reloading site...");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
      return res;
    },
    refetchInterval: 12000,
    staleTime: 5000,
  });

  const displayMessage =
    status?.message ||
    initialMessage ||
    "We are currently rolling out critical speed optimizations and server upgrades to make your experience even faster.";
  const displayTime = status?.estimatedTime || initialEstimatedTime || "15 - 30 Minutes";

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkStatusFn();
      if (!res.isMaintenance) {
        toast.success("System is now ONLINE! Reloading...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.info("System is still undergoing maintenance. Please check back shortly!");
      }
    } catch {
      toast.info("Checking server status...");
    } finally {
      setIsChecking(false);
    }
  };

  const handleBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bypassInput.trim().toLowerCase() === "admin" || bypassInput.trim().length >= 4) {
      sessionStorage.setItem("smm_maintenance_bypass", "true");
      toast.success("Admin bypass activated!");
      if (onAdminBypass) {
        onAdminBypass();
      } else {
        window.location.href = "/login?bypass=1";
      }
    } else {
      toast.error("Invalid bypass code.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#0c0a09] text-stone-100 selection:bg-orange-500 selection:text-black">
      {/* Background Glowing Amber & Orange Ambience */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-orange-600/25 via-amber-500/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-[400px] w-[600px] rounded-full bg-orange-700/15 blur-3xl" />
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ea580c10_1px,transparent_1px),linear-gradient(to_bottom,#ea580c10_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col justify-between px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header & Brand */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-stone-950 font-black shadow-lg shadow-orange-600/30">
              ⚡
            </div>
            <span className="text-lg font-black tracking-tight text-white">
              INTOPSMM<span className="text-orange-500">.ME</span>
            </span>
          </div>

          {/* Live Pulse Status */}
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500"></span>
            </span>
            <span>Maintenance Mode</span>
          </div>
        </header>

        {/* Hero Section */}
        <main className="my-8 flex flex-col items-center text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-stone-900/90 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-md">
            <Wrench className="h-3.5 w-3.5 text-orange-400" />
            <span>SYSTEM UPGRADE IN PROGRESS</span>
          </div>

          {/* Title */}
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
            We're Leveling Up Our{" "}
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">
              Servers 🚀
            </span>
          </h1>

          {/* Message */}
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-300 sm:text-base">
            {displayMessage}
          </p>

          {/* Key Status Indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-orange-500/25 bg-stone-900/80 px-3.5 py-2 text-xs font-medium text-stone-200">
              <Clock className="h-4 w-4 text-orange-400" />
              <span>Est. Time: <strong className="text-orange-300">{displayTime}</strong></span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-stone-900/80 px-3.5 py-2 text-xs font-medium text-stone-200">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>All Orders & Balances Are Safe</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="border-orange-500/30 bg-stone-900/80 text-xs text-orange-300 hover:bg-orange-500/20 hover:text-orange-200 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>{isChecking ? "Checking..." : "Check Status"}</span>
            </Button>
          </div>

          {/* Mini-Game Container */}
          <div className="mt-8 w-full">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-orange-400/90">
              🎮 While you wait, beat the high score:
            </div>
            <MaintenanceGame />
          </div>

          {/* Contact Support */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://wa.me/917903823485?text=Hello%20Intopsmm%20Support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-green-600/20 transition hover:brightness-110"
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp Support
            </a>

            <a
              href="https://t.me/intopsmm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition hover:brightness-110"
            >
              <ArrowRight className="h-4 w-4" />
              Telegram Channel
            </a>
          </div>
        </main>

        {/* Footer & Admin Bypass */}
        <footer className="mt-6 border-t border-stone-800/80 pt-4 text-center text-xs text-stone-400">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p>© {new Date().getFullYear()} Intopsmm. All services will resume automatically once updates finish.</p>

            {/* Admin Bypass Link */}
            <div>
              {!showAdminBypass ? (
                <button
                  onClick={() => setShowAdminBypass(true)}
                  className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-orange-400 transition"
                >
                  <Lock className="h-3 w-3" />
                  <span>Admin Access</span>
                </button>
              ) : (
                <form onSubmit={handleBypassSubmit} className="flex items-center gap-2">
                  <input
                    type="password"
                    value={bypassInput}
                    onChange={(e) => setBypassInput(e.target.value)}
                    placeholder="Admin passkey"
                    className="h-7 w-32 rounded border border-orange-500/40 bg-stone-900 px-2 text-xs text-white placeholder:text-stone-600 focus:outline-none focus:border-orange-500"
                    autoFocus
                  />
                  <Button type="submit" size="sm" className="h-7 bg-orange-500 text-[11px] font-bold text-stone-950 hover:bg-orange-400 px-2.5">
                    Enter
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowAdminBypass(false)}
                    className="text-[11px] text-stone-500 hover:text-stone-300"
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
