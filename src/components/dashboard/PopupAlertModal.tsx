import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, BellRing, Sparkles, Check, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getUserPopupAlerts, type Announcement } from "@/lib/announcements.functions";

export function PopupAlertModal() {
  const navigate = useNavigate();
  const fetchPopups = useServerFn(getUserPopupAlerts);

  const { data: popups = [] } = useQuery<Announcement[]>({
    queryKey: ["popup-alerts"],
    queryFn: async () => {
      const res = await fetchPopups();
      return res || [];
    },
    staleTime: 60 * 1000,
  });

  const [activeAlert, setActiveAlert] = useState<Announcement | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (popups.length > 0) {
      // Find the first popup alert that hasn't been dismissed
      const unreadAlert = popups.find((alert) => {
        try {
          const isDismissed = localStorage.getItem(`dismissed_popup_alert_${alert.id}`);
          return !isDismissed;
        } catch {
          return true;
        }
      });

      if (unreadAlert) {
        setActiveAlert(unreadAlert);
      }
    }
  }, [popups]);

  const handleClose = () => {
    if (activeAlert) {
      try {
        localStorage.setItem(`dismissed_popup_alert_${activeAlert.id}`, "true");
      } catch {
        // storage disabled fallback
      }
    }
    setActiveAlert(null);
  };

  const handleViewAllUpdates = () => {
    handleClose();
    navigate({ to: "/dashboard/updates" });
  };

  if (!activeAlert) return null;

  return (
    <Dialog open={Boolean(activeAlert)} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md border-amber-500/30 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              {activeAlert.badge || "System Announcement"}
            </span>
          </div>

          <DialogTitle className="mt-2 text-lg font-bold text-foreground">
            {activeAlert.title}
          </DialogTitle>

          <DialogDescription className="text-xs text-muted-foreground">
            Category: {activeAlert.category} • Posted:{" "}
            {new Date(activeAlert.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
            <p className="whitespace-pre-line text-sm text-foreground/90 leading-relaxed">
              {activeAlert.description}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(Boolean(checked))}
            />
            <label htmlFor="dont-show" className="text-xs text-muted-foreground cursor-pointer">
              I have read this announcement
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={handleViewAllUpdates}>
            View All Updates
          </Button>
          <Button variant="hero" size="sm" className="gap-1.5" onClick={handleClose}>
            <Check className="h-4 w-4" /> Got it, Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
