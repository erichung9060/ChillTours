"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { Activity } from "@/types/itinerary";
import { useItineraryStore } from "../store";

interface EditActivityDialogProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedActivity: Activity) => Promise<void>;
  onDelete: (activityId: string) => Promise<void>;
}

type Step = "edit" | "confirm-delete";

export function EditActivityDialog({
  activity,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: EditActivityDialogProps) {
  const t = useTranslations("planner.editDialog");
  const initialFocusRef = useRef<HTMLInputElement>(null);
  const isSaving = useItineraryStore((state) => state.isSaving);

  const [step, setStep] = useState<Step>("edit");
  const [formData, setFormData] = useState({
    title: activity.title,
    locationName: activity.location.name,
    note: activity.note || "",
    time: activity.time,
    duration: activity.duration_minutes,
    url: activity.url || "",
  });

  useEffect(() => {
    if (isOpen) {
      setStep("edit");
      setFormData({
        title: activity.title,
        locationName: activity.location.name,
        note: activity.note || "",
        time: activity.time,
        duration: activity.duration_minutes,
        url: activity.url || "",
      });
    }
  }, [activity, isOpen]);

  useEffect(() => {
    if (isOpen && step === "edit" && initialFocusRef.current) {
      setTimeout(() => {
        initialFocusRef.current?.focus();
      }, 100);
    }
  }, [isOpen, step]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updatedActivity: Activity = {
      ...activity,
      title: formData.title,
      location: {
        ...activity.location,
        name: formData.locationName,
      },
      note: formData.note,
      time: formData.time,
      duration_minutes: Number(formData.duration),
      url: formData.url || undefined,
    };
    try {
      await onSave(updatedActivity);
      onClose();
    } catch (err) {
      console.error("Save activity failed:", err);
    }
  };

  const handleDeleteClick = () => {
    setStep("confirm-delete");
  };

  const handleConfirmDelete = async () => {
    try {
      await onDelete(activity.id);
      onClose();
    } catch (err) {
      console.error("Delete activity failed:", err);
    }
  };

  const handleBackToEdit = () => {
    setStep("edit");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]" onClose={onClose}>
        {step === "edit" ? (
          /* ── Edit Step ── */
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>
                {t("description")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label htmlFor="title" className="text-sm font-medium">
                  {t("labelTitle")}
                </label>
                <Input
                  ref={initialFocusRef}
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="location" className="text-sm font-medium">
                  {t("labelLocation")}
                </label>
                <Input
                  id="location"
                  value={formData.locationName}
                  onChange={(e) =>
                    setFormData({ ...formData, locationName: e.target.value })
                  }
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label htmlFor="time" className="text-sm font-medium">
                    {t("labelTime")}
                  </label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) =>
                      setFormData({ ...formData, time: e.target.value })
                    }
                    disabled={isSaving}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="duration" className="text-sm font-medium">
                    {t("labelDuration")}
                  </label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration: Number(e.target.value),
                      })
                    }
                    disabled={isSaving}
                    required
                    min="1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label htmlFor="url" className="text-sm font-medium">
                  {t("labelUrl")}
                </label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  disabled={isSaving}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="note" className="text-sm font-medium">
                  {t("labelNote")}
                </label>
                <Textarea
                  id="note"
                  value={formData.note}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  disabled={isSaving}
                  placeholder={t("placeholderNote")}
                />
              </div>
            </div>
            <DialogFooter className="flex-row items-center justify-between sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDeleteClick}
                disabled={isSaving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t("delete")}
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* ── Confirm Delete Step ── */
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t("confirmDeleteTitle")}
              </DialogTitle>
              <DialogDescription>
                {t("confirmDeleteDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="my-4 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-semibold">{activity.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {activity.location.name} · {activity.time}
              </p>
            </div>

            <p className="text-sm text-muted-foreground">
              {t("confirmDeleteNote")}
            </p>

            <DialogFooter className="mt-6 gap-2">
              <Button variant="outline" onClick={handleBackToEdit} disabled={isSaving}>
                {t("cancelDelete")}
              </Button>
              <Button variant="destructive" onClick={handleConfirmDelete} disabled={isSaving}>
                {isSaving ? t("saving") : t("confirmDelete")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
