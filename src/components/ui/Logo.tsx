import markUrl from "@/assets/logo-mark.png";
import wordmarkUrl from "@/assets/logo-wordmark.png";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img src={markUrl} alt="Intopsmm" className="h-10 w-auto object-contain" />
      {showWordmark && (
        <img src={wordmarkUrl} alt="Intopsmm" className="h-6 w-auto object-contain" />
      )}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <img src={markUrl} alt="Intopsmm" className={cn("h-10 w-auto object-contain", className)} />;
}

export function LogoWordmark({ className }: { className?: string }) {
  return <img src={wordmarkUrl} alt="Intopsmm" className={cn("h-6 w-auto object-contain", className)} />;
}
