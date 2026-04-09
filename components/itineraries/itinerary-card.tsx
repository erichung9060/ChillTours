"use client";

import { useTranslations, useLocale } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDateDisplay } from "@/lib/utils/date";
import type { ItinerarySummary } from "@/lib/supabase/itineraries";

interface ItineraryCardProps {
  itinerary: ItinerarySummary;
  onClick: (id: string) => void;
}

/**
 * ItineraryCard Component
 *
 * Displays a single itinerary summary with title, destination, and date range.
 * Supports click navigation and keyboard accessibility.
 *
 * Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3
 */
export function ItineraryCard({ itinerary, onClick }: ItineraryCardProps) {
  const t = useTranslations("itineraries.card");
  const locale = useLocale();

  const handleClick = () => {
    onClick(itinerary.id);
  };

  // Format dates according to locale
  const startDate = formatDateDisplay(itinerary.start_date, locale);
  const endDate = formatDateDisplay(itinerary.end_date, locale);

  return (
    <Card className="cursor-pointer" onClick={handleClick}>
      <CardHeader>
        <CardTitle className="text-xl">{itinerary.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="font-medium">{t("destination")}</span>
            <span className="ml-2">{itinerary.destination}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <span className="font-medium">{t("dates")}</span>
            <span className="ml-2">
              {startDate} - {endDate}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
