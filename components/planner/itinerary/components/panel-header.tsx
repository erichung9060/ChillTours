/**
 * Panel Header Component
 *
 * Renders the header with itinerary title, view mode controls, and fullscreen toggle.
 */

"use client";

import { Button } from "@/components/ui/button";
import { VIEW_MODES } from "../constants";
import type { PanelHeaderProps } from "../types";

export function PanelHeader({
  itinerary,
  viewMode,
  setViewMode,
  isFullscreen,
  toggleFullscreen,
}: PanelHeaderProps) {
  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div className="flex-1">
        <h1 className="text-xl font-semibold">{itinerary.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {itinerary.destination}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(itinerary.start_date).toLocaleDateString()} -{" "}
          {new Date(itinerary.end_date).toLocaleDateString()}
        </p>
      </div>

      {/* View Mode Controls */}
      <div className="flex items-center gap-2">
        {/* View Mode Selector */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {VIEW_MODES.map((mode) => (
            <Button
              key={mode.id}
              variant={viewMode === mode.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode(mode.id)}
              className="h-8 px-3"
              title={mode.title}
            >
              {mode.icon()}
            </Button>
          ))}
        </div>

        {/* Fullscreen Toggle - Always visible, hidden on mobile */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleFullscreen}
          className="hidden md:flex h-8 w-8 p-0"
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}
