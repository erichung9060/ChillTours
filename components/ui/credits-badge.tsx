"use client";

import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useProfile } from "@/hooks/use-profile";

export function CreditsBadge() {
  const { credits } = useProfile();
  const t = useTranslations("profile");

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
      <Coins className="h-4 w-4 text-amber-500" />
      <span className="font-medium tabular-nums">{credits}</span>
      <span className="text-muted-foreground">{t("credits")}</span>
    </div>
  );
}
