"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Car, PersonStanding, Bus, Bike, Check, ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { TransportModeSchema } from "@/types/itinerary";
import type { TransportMode } from "@/types/itinerary";

interface DayTransportPickerProps {
  dayNumber: number;
  mode: TransportMode | undefined;
  onSave?: (dayNumber: number, mode: TransportMode) => Promise<void>;
  onApplyAll?: (mode: TransportMode) => Promise<void>;
}

const MODES = TransportModeSchema.options;

const MODE_ICONS: Record<TransportMode, React.ElementType> = {
  driving: Car,
  walking: PersonStanding,
  transit: Bus,
  bicycling: Bike,
};

export function DayTransportPicker({
  dayNumber,
  mode,
  onSave,
  onApplyAll,
}: DayTransportPickerProps) {
  const t = useTranslations("planner.transportMode");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isEditable = !!onSave;
  const ActiveIcon = mode ? MODE_ICONS[mode] : null;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditable) return;
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((v) => !v);
  };

  const handleSelect = async (selected: TransportMode) => {
    if (!onSave || selected === mode) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(dayNumber, selected);
      setOpen(false);
    } catch (err) {
      console.error("[DayTransportPicker] save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyAll = async () => {
    if (!onApplyAll || !mode) return;
    setSaving(true);
    try {
      await onApplyAll(mode);
      setOpen(false);
      toast.success(t("applyAllSuccess", { mode: t(mode) }));
    } catch (err) {
      console.error("[DayTransportPicker] applyAll failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        disabled={!isEditable}
        className={`flex items-center gap-1 text-xs text-muted-foreground transition-colors px-1 py-0.5 rounded ${
          isEditable
            ? "hover:text-foreground hover:bg-accent cursor-pointer"
            : "cursor-default opacity-75"
        }`}
      >
        {ActiveIcon ? (
          <ActiveIcon className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Car className="h-3 w-3 opacity-40" aria-hidden="true" />
        )}
        <span>{mode ? t(mode) : t("noMode")}</span>
        {isEditable && <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: panelPos.top, left: panelPos.left }}
            className="z-[9999] bg-popover border border-border rounded-md shadow-md py-1 w-48"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="text-xs font-medium text-muted-foreground px-3 py-1.5">
              {t("title", { dayNumber })}
            </p>
            {MODES.map((m) => {
              const Icon = MODE_ICONS[m];
              const isActive = m === mode;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={saving}
                  onClick={() => handleSelect(m)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm transition-colors ${
                    isActive ? "text-primary bg-primary/10" : "text-foreground hover:bg-accent"
                  } disabled:opacity-50`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">{t(m)}</span>
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}

            {onApplyAll && mode && (
              <>
                <div className="border-t border-border my-1" />
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleApplyAll}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <span>{t("applyAllMode", { mode: t(mode) })}</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
