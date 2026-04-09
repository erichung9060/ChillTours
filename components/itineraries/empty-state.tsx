"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  onCreateClick: () => void;
}

export function EmptyState({ onCreateClick }: EmptyStateProps) {
  const t = useTranslations("itineraries.empty");

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-6">
        <svg
          className="w-24 h-24 mx-auto text-muted-foreground/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2">{t("title")}</h2>

      <p className="text-muted-foreground mb-8 max-w-md">{t("description")}</p>

      <Button variant="primary" size="lg" onClick={onCreateClick}>
        {t("createFirst")}
      </Button>
    </div>
  );
}
