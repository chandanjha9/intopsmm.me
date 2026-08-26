import logoUrl from "@/assets/logo.jpg";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Intopsmm"
      className={cn("h-10 w-auto object-contain", className)}
    />
  );
}
