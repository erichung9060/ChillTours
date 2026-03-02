"use client";

import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("landing.hero");

  return (
    <div className="text-center space-y-3 mb-8">
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
        <span className="text-foreground">{t("whereToNext")} </span>
        <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-gradient">
          {t("next")}
        </span>
      </h1>
      <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
        {t("subtitle")}
      </p>
    </div>
  );
}
