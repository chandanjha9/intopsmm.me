import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Global navigation feedback: a top progress bar plus a "Loading…" tab title
 * while the router is moving between pages, so switching dashboard modules
 * feels like a real page load.
 */
export function RouteProgress() {
  const isNavigating = useRouterState({
    select: (s) => s.status === "pending" || s.isLoading || s.isTransitioning,
  });

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const titleRef = useRef<string | null>(null);

  useEffect(() => {
    if (isNavigating) {
      setVisible(true);
      setProgress(12);
      const timer = setInterval(() => {
        setProgress((p) => (p >= 90 ? p : p + Math.max(1, (90 - p) * 0.15)));
      }, 120);

      if (typeof document !== "undefined" && titleRef.current === null) {
        titleRef.current = document.title;
        document.title = "Loading…";
      }
      return () => clearInterval(timer);
    }

    if (typeof document !== "undefined" && titleRef.current !== null) {
      titleRef.current = null;
    }
    setProgress(100);
    const done = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 260);
    return () => clearTimeout(done);
  }, [isNavigating]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100]"
    >
      <div
        className="h-[3px] bg-[image:var(--gradient-primary)] shadow-glow transition-[width,opacity] duration-200 ease-out"
        style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
