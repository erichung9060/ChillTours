/**
 * Panel Header Component
 *
 * Renders the header with itinerary title, view mode controls, and fullscreen toggle.
 */

"use client";

import { ShareDialog } from "@/components/share/share-dialog";
import { useItineraryPermission } from "@/hooks/use-itinerary-permission";
import { Button } from "@/components/ui/button";
import { VIEW_MODES } from "../constants";
import type { PanelHeaderProps } from "../types";
import { EditMetadataDialog } from "./edit-metadata-dialog";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Pencil, Maximize, Minimize, Loader2, Cloud, Plus, Undo2, Redo2 } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date";
import { useItineraryStore } from "../store";
import { useRouter } from "@/lib/i18n/navigation";
import { deleteItinerary } from "@/lib/supabase/itineraries";
import { toast } from "sonner";

export function PanelHeader({
  itinerary,
  viewMode,
  setViewMode,
  isFullscreen,
  toggleFullscreen,
}: PanelHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("common");
  const { canEdit, canShare } = useItineraryPermission();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isSaving = useItineraryStore((state) => state.isSaving);
  const updateMetadata = useItineraryStore((state) => state.updateMetadata);
  const isAddingActivity = useItineraryStore((state) => state.isAddingActivity);
  const setIsAddingActivity = useItineraryStore((state) => state.setIsAddingActivity);
  const canUndo = useItineraryStore((state) => state.getCanUndo());
  const canRedo = useItineraryStore((state) => state.getCanRedo());
  const undo = useItineraryStore((state) => state.undo);
  const redo = useItineraryStore((state) => state.redo);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      await deleteItinerary(itinerary.id);
      setIsEditDialogOpen(false);
      router.push("/itineraries");
    } catch (error) {
      console.error("Failed to delete itinerary:", error);
      throw error;
    }
  };

  return (
    <div className="py-2.5 px-4 border-b border-border flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{itinerary.title}</h1>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              title="Edit Trip Details"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}

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
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDateDisplay(itinerary.start_date, locale)} -{" "}
          {formatDateDisplay(itinerary.end_date, locale)}
        </p>
      </div>

      {/* View Mode Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void undo().catch(() => toast.error(t("error")))}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Undo"
          disabled={!canEdit || !canUndo || isSaving}
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void redo().catch(() => toast.error(t("error")))}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          title="Redo"
          disabled={!canEdit || !canRedo || isSaving}
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        {/* Add Activity Button */}
        {canEdit && (
          <Button
            variant={isAddingActivity ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsAddingActivity(!isAddingActivity)}
            className={`h-8 w-8 p-0 ${isAddingActivity
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground hover:text-foreground"
            }`}
            title="Add Activity"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {canShare && (
          <ShareDialog
            itineraryId={itinerary.id}
            itineraryTitle={itinerary.title}
            linkAccess={itinerary.link_access}
          />
        )}

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
        onDelete={handleDelete}
      />
    </div>
  );
}
