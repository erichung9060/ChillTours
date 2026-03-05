/**
 * Activity Card Component
 *
 * Displays activity information including time, location, description, and duration.
 */

"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Pencil } from "lucide-react";
import type { ActivityCardProps } from "../types";
import { getMapProvider } from "@/lib/maps/provider-factory";
import { EditActivityDialog } from "./edit-activity-dialog";
import { useItineraryStore } from "../store";

export function ActivityCard({
  activity,
  className,
  onMouseEnter,
  onMouseLeave,
}: ActivityCardProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const updateActivity = useItineraryStore((state) => state.updateActivity);
  const deleteActivity = useItineraryStore((state) => state.deleteActivity);

  const handleNavigationConfig = (e: React.MouseEvent) => {
    e.stopPropagation();
    const mapProvider = getMapProvider();
    const url = mapProvider.createNavigationLink(activity.location);
    window.open(url, "_blank");
  };

  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activity.url) {
      window.open(activity.url, "_blank");
    } else {
      handleNavigationConfig(e);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditDialogOpen(true);
  };

  return (
    <Card
      className={`group relative ${className}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-50 cursor-pointer"
        onClick={handleExternalLinkClick}
        title="Open Website"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute bottom-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity z-50 cursor-pointer"
        onClick={handleEditClick}
        title="Edit Activity"
      >
        <Pencil className="h-4 w-4" />
      </Button>

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Time Badge */}
          <div className="flex-shrink-0 px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary">
            {activity.time}
          </div>

          <div className="flex-1 min-w-0 pr-8">
            <h4 className="font-semibold text-sm mb-2">{activity.title}</h4>

            <Button
              variant="ghost"
              className="flex items-center gap-1 text-xs opacity-100 mb-1 h-auto p-1 -ml-1 cursor-pointer w-fit max-w-full"
              onClick={handleNavigationConfig}
              title="Navigate with Google Maps"
            >
              <img
                src="https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico"
                alt="Google Maps"
                className="h-4 w-4 object-contain flex-shrink-0"
              />
              <span className="truncate">{activity.location.name}</span>
            </Button>

            {activity.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {activity.description}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{activity.duration_minutes} min</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <EditActivityDialog
        activity={activity}
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSave={(updatedActivity) => updateActivity(updatedActivity)}
        onDelete={(id) => deleteActivity(id)}
      />
    </Card>
  );
}
