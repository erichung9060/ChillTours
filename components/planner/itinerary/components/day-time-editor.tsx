"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DayTimeEditorProps {
  dayNumber: number;
  startTime: string;
  endTime: string;
  onSave: (
    dayNumber: number,
    startTime: string | undefined,
    endTime: string | undefined,
  ) => Promise<void>;
  onApplyAll: (startTime: string | undefined, endTime: string | undefined) => Promise<void>;
}

export function DayTimeEditor({
  dayNumber,
  startTime,
  endTime,
  onSave,
  onApplyAll,
}: DayTimeEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ startTime, endTime });
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("planner.dayTimeEditor");

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    setDraft({ startTime, endTime });
    setOpen((v) => !v);
  };

  const normalizeTime = (value: string): string | undefined =>
    value.trim() === "" ? undefined : value;

  const save = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await onSave(dayNumber, normalizeTime(draft.startTime), normalizeTime(draft.endTime));
      setOpen(false);
    } catch (err) {
      console.error("[DayTimeEditor] save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const applyAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    try {
      await onApplyAll(normalizeTime(draft.startTime), normalizeTime(draft.endTime));
      setOpen(false);
    } catch (err) {
      console.error("[DayTimeEditor] applyAll failed:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative" ref={containerRef} onClick={(e) => e.stopPropagation()}>
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-accent"
        onClick={handleOpen}
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {startTime} – {endTime}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-popover border border-border rounded-md shadow-md p-3 w-56">
          <p className="text-xs font-medium mb-2">{t("title", { dayNumber })}</p>
          <div className="flex items-center gap-2 mb-3">
            <Input
              type="time"
              value={draft.startTime}
              onChange={(e) => setDraft((d) => ({ ...d, startTime: e.target.value }))}
              className="h-7 text-xs px-2"
            />
            <span className="text-xs text-muted-foreground shrink-0">–</span>
            <Input
              type="time"
              value={draft.endTime}
              onChange={(e) => setDraft((d) => ({ ...d, endTime: e.target.value }))}
              className="h-7 text-xs px-2"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs flex-1" onClick={save} disabled={saving}>
              {t("save")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={applyAll}
              disabled={saving}
            >
              {t("applyAll")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
