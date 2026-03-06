/**
 * Panel Header Component
 *
 * Renders the header with itinerary title, view mode controls, and fullscreen toggle.
 */

"use client";

import { Button } from "@/components/ui/button";
import { VIEW_MODES } from "../constants";
import type { PanelHeaderProps } from "../types";
import { EditMetadataDialog } from "./edit-metadata-dialog";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Maximize, Minimize, Loader2, Cloud } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date";
import { useItineraryStore } from "../store";

export function PanelHeader({
  itinerary,
  viewMode,
  setViewMode,
  isFullscreen,
  toggleFullscreen,
}: PanelHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isSaving = useItineraryStore((state) => state.isSaving);
  const updateMetadata = useItineraryStore((state) => state.updateMetadata);

  return (
    <div className="p-4 border-b border-border flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold">{itinerary.title}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Edit Trip Details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          {isSaving ? (
            <div className="flex items-center gap-1.5 ml-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{t("saving")}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 ml-2 text-xs text-muted-foreground">
              <Cloud className="h-3 w-3" />
              <span>{t("savedToCloud")}</span>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {itinerary.destination}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDateDisplay(itinerary.start_date, locale)} -{" "}
          {formatDateDisplay(itinerary.end_date, locale)}
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
            <Minimize className="h-4 w-4" />
          ) : (
            <Maximize className="h-4 w-4" />
          )}
        </Button>
      </div>

      <EditMetadataDialog
        itinerary={itinerary}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={(updates) => updateMetadata(updates)}
      />
    </div>
  );
}
