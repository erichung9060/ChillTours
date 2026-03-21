"use client";

import type { TransportMode } from "../types";

const MODES: { value: TransportMode; label: string; icon: string }[] = [
  { value: "driving",   label: "開車",   icon: "🚗" },
  { value: "transit",   label: "大眾",   icon: "🚌" },
  { value: "walking",   label: "步行",   icon: "🚶" },
  { value: "bicycling", label: "單車",   icon: "🚲" },
];

interface TransportModeSelectorProps {
  mode: TransportMode;
  onChange: (mode: TransportMode) => void;
  disabled?: boolean;
}

export function TransportModeSelector({ mode, onChange, disabled }: TransportModeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5">
      {MODES.map((m) => (
        <button
          key={m.value}
          title={m.label}
          disabled={disabled}
          onClick={() => onChange(m.value)}
          className={`h-6 w-7 rounded text-xs transition-colors ${
            mode === m.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {m.icon}
        </button>
      ))}
    </div>
  );
}
