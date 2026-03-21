"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DayTimeEditorProps {
  dayNumber: number;
  startTime: string;
  endTime: string;
  onSave: (dayNumber: number, startTime: string, endTime: string) => Promise<void>;
  onApplyAll: (startTime: string, endTime: string) => Promise<void>;
}

export function DayTimeEditor({ dayNumber, startTime, endTime, onSave, onApplyAll }: DayTimeEditorProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ startTime, endTime });
  const [saving, setSaving] = useState(false);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft({ startTime, endTime });
    setOpen((v) => !v);
  };

  const save = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    await onSave(dayNumber, draft.startTime, draft.endTime);
    setSaving(false);
    setOpen(false);
  };

  const applyAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaving(true);
    await onApplyAll(draft.startTime, draft.endTime);
    setSaving(false);
    setOpen(false);
  };

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 rounded hover:bg-accent"
        onClick={handleOpen}
        type="button"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {startTime} – {endTime}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-popover border border-border rounded-md shadow-md p-3 w-56">
          <p className="text-xs font-medium mb-2">Day {dayNumber} 時間範圍</p>
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
              儲存
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={applyAll} disabled={saving}>
              套用全部天
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
