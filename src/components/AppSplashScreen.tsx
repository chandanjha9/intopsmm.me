import { useEffect, useState } from "react";
import markUrl from "@/assets/logo-mark.png";
import { Sparkles, ShieldCheck } from "lucide-react";

interface AppSplashScreenProps {
  message?: string;
}

export function AppSplashScreen({ message = "Connecting to dashboard…" }: AppSplashScreenProps) {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Smooth progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.floor(Math.random() * 15 + 10);
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070b14] text-white select-none overflow-hidden">
      {/* Dynamic ambient backdrop glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-emerald-500/20 blur-[110px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-cyan-500/20 blur-[90px]" />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center animate-in fade-in zoom-in-95 duration-500">
        {/* Animated Glowing Logo with Ripple Rings */}
        <div className="relative mb-6">
          {/* Outer pulsating glow rings */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 blur-xl animate-pulse" />
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-30 animate-spin [animation-duration:6s]" />

          {/* Logo Card */}
          <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-b from-[#111927] to-[#0a0f1d] border border-white/10 p-3 shadow-2xl flex items-center justify-center">
            <img
              src={markUrl}
              alt="Intopsmm"
              className="h-12 w-12 object-contain filter drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]"
            />
          </div>

          {/* Micro status badge */}
          <div className="absolute -bottom-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[#070b14] shadow-lg ring-2 ring-[#070b14]">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
          INTOPSMM
        </h1>
        <p className="mt-1 text-xs font-medium text-emerald-400/90 tracking-widest uppercase flex items-center gap-1.5 justify-center">
          <Sparkles className="h-3 w-3" /> #1 SMM Automation Platform
        </p>

        {/* Progress bar container */}
        <div className="mt-8 w-56 max-w-xs">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(34,197,94,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-slate-400 font-normal tracking-wide animate-pulse">
            {message}
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-[11px] text-slate-500 font-medium tracking-wider uppercase">
          Official Secure App
        </p>
      </div>
    </div>
  );
}
