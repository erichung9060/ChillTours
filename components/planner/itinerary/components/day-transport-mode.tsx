"use client";

import { Car, PersonStanding, Bus, Bike, Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TransportMode } from "@/types/itinerary";

interface DayTransportModeProps {
  dayNumber: number;
  mode: TransportMode | undefined;
  onSave?: (dayNumber: number, mode: TransportMode) => Promise<void>;
  onApplyAll?: (mode: TransportMode) => Promise<void>;
}

const MODES: TransportMode[] = ["driving", "walking", "transit", "bicycling"];

const MODE_ICONS: Record<TransportMode, React.ElementType> = {
  driving: Car,
  walking: PersonStanding,
  transit: Bus,
  bicycling: Bike,
};

export function DayTransportMode({ dayNumber, mode, onSave, onApplyAll }: DayTransportModeProps) {
  const t = useTranslations("planner.transportMode");
  const isEditable = !!onSave;

  const handleSelect = async (selected: TransportMode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSave || selected === mode) return;
    await onSave(dayNumber, selected);
  };

  const handleApplyAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onApplyAll || !mode) return;
    await onApplyAll(mode);
  };

  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {MODES.map((m) => {
        const isActive = m === mode;
        const Icon = MODE_ICONS[m];
        return (
          <button
            key={m}
            type="button"
            title={t(m)}
            onClick={(e) => handleSelect(m, e)}
            disabled={!isEditable}
            className={`p-0.5 rounded transition-colors ${
              isActive
                ? "text-primary bg-primary/10"
                : isEditable
                  ? "text-muted-foreground hover:text-foreground hover:bg-accent"
                  : "text-muted-foreground/40 cursor-default"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
      {isEditable && mode && onApplyAll && (
        <button
          type="button"
          title={t("applyAll")}
          onClick={handleApplyAll}
          className="ml-0.5 p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
