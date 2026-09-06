import { useState, useEffect } from "react";
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if already installed in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check dismissal cooldown (dismissed in the last 2 days)
    const dismissedAt = localStorage.getItem("intopsmm_pwa_dismissed_at");
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - Number(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 2) {
        return;
      }
    }

    // 3. Detect iOS Safari
    const ua = window.navigator.userAgent;
    const isIosDevice = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);

    if (isIosDevice && isSafari) {
      setIsIos(true);
      // Small delay before showing so it doesn't jarringly pop up immediately on page load
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // 4. Android / Chrome beforeinstallprompt event
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      // Wait 2.5 seconds after page load before displaying prompt
      setTimeout(() => {
        setIsVisible(true);
      }, 2500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("PWA install error:", err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("intopsmm_pwa_dismissed_at", Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-background/95 p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10 dark:bg-card/95">
        {/* Glow Accent */}
        <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5">
          {/* App Icon */}
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-xl overflow-hidden border border-border/80 bg-background p-1.5 shadow-md flex items-center justify-center">
              <img src="/favicon.png" alt="Intopsmm App" className="h-full w-full object-contain" />
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              ✓
            </div>
          </div>

          {/* App Info */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold text-foreground tracking-tight truncate">
                Intopsmm App
              </h3>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500">
                <Sparkles className="h-2.5 w-2.5" /> APK / WebApp
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              Faster 1-click access, instant order status updates & zero storage impact.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 transition-colors"
            aria-label="Dismiss app install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 flex items-center gap-2 pt-1 border-t border-border/40">
          <Button
            size="sm"
            variant="default"
            onClick={handleInstallClick}
            className="flex-1 gap-1.5 h-9 rounded-xl font-medium shadow-md shadow-primary/20 hover:shadow-primary/30"
          >
            {isIos ? (
              <>
                <Share2 className="h-3.5 w-3.5" />
                Add to Home Screen
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Install App (1-Click)
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-9 px-3 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            Not now
          </Button>
        </div>

        {/* iOS Step-by-Step Tooltip Modal */}
        {showIosInstructions && (
          <div className="mt-3 rounded-xl bg-muted/60 p-3 text-xs border border-border/60 animate-in fade-in">
            <p className="font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Smartphone className="h-3.5 w-3.5 text-primary" /> How to install on iPhone/iPad:
            </p>
            <ol className="space-y-1 text-muted-foreground list-decimal pl-4">
              <li>
                Tap the <span className="font-medium text-foreground">Share</span> icon (
                <Share2 className="inline h-3 w-3 text-primary" />) in Safari's bottom toolbar.
              </li>
              <li>
                Scroll down and tap{" "}
                <span className="font-medium text-foreground">Add to Home Screen</span> (
                <PlusSquare className="inline h-3 w-3 text-primary" />
                ).
              </li>
              <li>
                Tap <span className="font-medium text-foreground">Add</span> in the top right corner.
              </li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
