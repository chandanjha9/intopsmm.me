import logoUrl from "@/assets/logo.png";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Intopsmm"
      className={cn("h-12 w-auto object-contain", className)}
    />
  );
}
