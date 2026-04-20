"use client";

import { useTranslations } from "next-intl";
import type { TransportMode } from "@/types/itinerary";

interface DayTransportModeProps {
  dayNumber: number;
  mode: TransportMode | undefined;
  onSave?: (dayNumber: number, mode: TransportMode) => Promise<void>;
  onApplyAll?: (mode: TransportMode) => Promise<void>;
}

const MODES: TransportMode[] = ["driving", "walking", "transit", "bicycling"];

function ModeIcon({ mode }: { mode: TransportMode }) {
  switch (mode) {
    case "driving":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h11l4 4v4a2 2 0 0 1-2 2h-1" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      );
    case "walking":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="4" r="1" />
          <path d="m9 20 1-5 2 2 1-4" />
          <path d="m6 13 2-4 4 1 2 3" />
          <path d="m15 20-1-5" />
        </svg>
      );
    case "transit":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="3" width="16" height="13" rx="2" />
          <path d="M8 19h8M10 15v4M14 15v4" />
          <path d="M4 9h16" />
          <circle cx="8.5" cy="12" r="0.5" fill="currentColor" />
          <circle cx="15.5" cy="12" r="0.5" fill="currentColor" />
        </svg>
      );
    case "bicycling":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="5.5" cy="17.5" r="3.5" />
          <circle cx="18.5" cy="17.5" r="3.5" />
          <path d="M15 6a1 1 0 0 0-1-1h-1" />
          <path d="M12 6l-3 6h7l-3-5.5" />
          <path d="M5.5 17.5l3.5-6 3.5 5.5" />
        </svg>
      );
  }
}

export function DayTransportMode({ dayNumber, mode, onSave, onApplyAll }: DayTransportModeProps) {
  const t = useTranslations("planner.transportMode");
  const isEditable = !!onSave;

  const handleSelect = async (selected: TransportMode, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditable || !onSave || selected === mode) return;
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
            <ModeIcon mode={m} />
          </button>
        );
      })}
      {isEditable && mode && onApplyAll && (
        <button
          type="button"
          title={t("applyAll")}
          onClick={handleApplyAll}
          className="ml-0.5 text-[10px] text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent transition-colors"
        >
          ×all
        </button>
      )}
    </div>
  );
}
