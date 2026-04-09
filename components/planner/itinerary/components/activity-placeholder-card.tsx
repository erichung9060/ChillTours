/**
 * Activity Placeholder Card Component
 *
 * A dashed-border placeholder card that displays "Click to Add" text.
 * Matches ActivityCard dimensions and spacing for seamless integration.
 */

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";

interface ActivityPlaceholderCardProps {
  onClick: () => void;
}

export function ActivityPlaceholderCard({ onClick }: ActivityPlaceholderCardProps) {
  const t = useTranslations("planner.activityPlaceholderCard");

  return (
    <Card
      className="mb-3 border-dashed border-2 border-primary/40 bg-primary/5 cursor-pointer transition-all hover:border-primary/60 hover:bg-primary/10"
      onClick={onClick}
      data-testid="activity-placeholder-card"
    >
      <CardContent className="p-4 flex items-center justify-center min-h-[100px]">
        <div className="flex flex-col items-center gap-2 text-center">
          <Plus className="h-6 w-6 text-primary/60" />
          <p className="text-sm font-medium text-primary/60">{t("clickToAdd")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
