import { useEffect, useState } from "react";

/**
 * A subtle full‑screen overlay with a CSS spinner.
 * Appears after a short delay (200 ms) to avoid flicker on fast navigations.
 */
export function LoadingOverlay({ isActive }: { isActive: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => setShow(true), 200);
      return () => clearTimeout(timer);
    }
    setShow(false);
  }, [isActive]);

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="animate-spin rounded-full border-4 border-primary border-t-transparent w-12 h-12" />
    </div>
  );
}
