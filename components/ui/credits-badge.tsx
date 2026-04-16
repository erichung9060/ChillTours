"use client";

import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils/cn";

export function CreditsBadge() {
  const { credits } = useProfile();
  const t = useTranslations("profile");

  return (
    <div
      className={cn(
        // Base layout & shape
        "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium",
        // Glassmorphism & Borders
        "bg-white/60 backdrop-blur-md border border-amber-500/20 shadow-sm",
        "dark:bg-card/40 dark:border-amber-500/10",
        // Micro-interactions
        "transition-all duration-300 ease-out cursor-default select-none",
        "hover:-translate-y-0.5 hover:scale-105 active:scale-[0.98]",
        // Glow effects on hover
        "hover:shadow-md hover:shadow-amber-500/15 hover:border-amber-500/40",
        "dark:hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] dark:hover:border-amber-500/30",
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 h-4 w-4 animate-pulse rounded-full bg-amber-500/20 blur-sm" />
        <Coins className="relative h-4 w-4 text-amber-500 drop-shadow-[0_0_3px_rgba(245,158,11,0.5)]" />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="tabular-nums text-foreground tracking-tight font-bold">{credits}</span>
        <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider">
          {t("credits")}
        </span>
      </div>
    </div>
  );
}
