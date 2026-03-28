"use client";

import { Star, X, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useItineraryStore, type MealSuggestion } from "../store";
import type { RestaurantCandidate } from "@/app/api/places-nearby/route";
import { useTranslations } from "next-intl";

interface MealSuggestionCardProps {
  suggestion: MealSuggestion;
}

function MealSuggestionCard({ suggestion }: MealSuggestionCardProps) {
  const selectMealRestaurant = useItineraryStore((s) => s.selectMealRestaurant);
  const dismissMealSuggestion = useItineraryStore((s) => s.dismissMealSuggestion);
  const t = useTranslations("planner.mealSuggestion");
  const tType = useTranslations("activityType");

  const mealLabel = tType(suggestion.mealType);

  function handleSelect(restaurant: RestaurantCandidate) {
    selectMealRestaurant(suggestion.dayNumber, suggestion.placeholderId, restaurant);
  }

  return (
    <Card className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-sm font-medium text-orange-700 dark:text-orange-300">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>{t("title", { day: suggestion.dayNumber, meal: mealLabel })}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground"
            onClick={() => dismissMealSuggestion(suggestion.placeholderId)}
            aria-label={t("dismiss")}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Restaurant options */}
        <div className="flex flex-col gap-1.5">
          {suggestion.restaurants.map((r) => (
            <button
              key={r.place_id}
              onClick={() => handleSelect(r)}
              className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm bg-background hover:bg-accent transition-colors border border-border"
            >
              <span className="font-medium truncate flex-1 mr-2">{r.name}</span>
              {r.rating != null && (
                <span className="flex items-center gap-0.5 text-xs text-amber-500 shrink-0">
                  <Star className="h-3 w-3 fill-amber-400 stroke-amber-400" />
                  {r.rating.toFixed(1)}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{t("hint")}</p>
      </CardContent>
    </Card>
  );
}

export function MealSuggestionPanel() {
  const mealSuggestions = useItineraryStore((s) => s.mealSuggestions);

  if (mealSuggestions.length === 0) return null;

  return (
    <div className="px-3 pb-2 flex flex-col gap-2">
      {mealSuggestions.map((s) => (
        <MealSuggestionCard key={s.placeholderId} suggestion={s} />
      ))}
    </div>
  );
}
