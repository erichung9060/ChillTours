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
import { DateRangePicker } from "@/components/landing/date-range-picker";
import { parseLocalDate, formatLocalDate, calcDayCount } from "@/lib/utils/date";
import type { Itinerary } from "@/types/itinerary";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useItineraryStore } from "../store";

interface EditMetadataDialogProps {
    itinerary: Itinerary;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updates: Partial<Pick<Itinerary, "title" | "destination" | "start_date" | "end_date" | "requirements">>) => Promise<void>;
    onDelete?: () => Promise<void>;
}

type Step = "edit" | "confirm-shrink" | "confirm-delete";

export function EditMetadataDialog({
    itinerary,
    isOpen,
    onClose,
    onSave,
    onDelete,
}: EditMetadataDialogProps) {
    const t = useTranslations("planner.editMetadataDialog");
    const initialFocusRef = useRef<HTMLInputElement>(null);
    const isSaving = useItineraryStore((state) => state.isSaving);

    const [step, setStep] = useState<Step>("edit");
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState({
        title: itinerary.title,
        destination: itinerary.destination,
        requirements: itinerary.requirements || "",
    });
    const [startDate, setStartDate] = useState<Date | undefined>(parseLocalDate(itinerary.start_date));
    const [endDate, setEndDate] = useState<Date | undefined>(parseLocalDate(itinerary.end_date));

    useEffect(() => {
        if (isOpen) {
            setStep("edit");
            setFormData({
                title: itinerary.title,
                destination: itinerary.destination,
                requirements: itinerary.requirements || "",
            });
            setStartDate(parseLocalDate(itinerary.start_date));
            setEndDate(parseLocalDate(itinerary.end_date));
        }
    }, [itinerary, isOpen]);

    useEffect(() => {
        if (isOpen && step === "edit" && initialFocusRef.current) {
            setTimeout(() => {
                initialFocusRef.current?.focus();
            }, 100);
        }
    }, [isOpen, step]);

    // ─── Derived: how many days will be affected by shrinking ───────────────
    const oldDayCount = calcDayCount(itinerary.start_date, itinerary.end_date);
    const newDayCount =
        startDate && endDate
            ? calcDayCount(formatLocalDate(startDate), formatLocalDate(endDate))
            : oldDayCount;

    const isShrinking = newDayCount < oldDayCount;
    const removedDayCount = isShrinking ? oldDayCount - newDayCount : 0;

    // All days that will be removed (including empty ones)
    const affectedDays = itinerary.days
        .filter((d) => d.day_number > newDayCount)
        .sort((a, b) => a.day_number - b.day_number);

    // ─── Submit handlers ─────────────────────────────────────────────────────
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        if (!startDate || !endDate) return;

        const formattedStart = formatLocalDate(startDate);
        const formattedEnd = formatLocalDate(endDate);

        // If the user is about to shorten the trip, show confirmation step first
        if (isShrinking && step === "edit") {
            setStep("confirm-shrink");
            return;
        }

        doSave(formattedStart, formattedEnd);
    };

    const doSave = async (formattedStart: string, formattedEnd: string) => {
        try {
            await onSave({
                title: formData.title,
                destination: formData.destination,
                start_date: formattedStart,
                end_date: formattedEnd,
                requirements: formData.requirements || undefined,
            });
            onClose();
        } catch (err) {
            console.error("Save metadata failed:", err);
        }
    };

    const handleConfirmShrink = () => {
        if (!startDate || !endDate) return;
        doSave(formatLocalDate(startDate), formatLocalDate(endDate));
    };

    const handleDelete = async () => {
        if (!onDelete) return;
        setIsDeleting(true);
        try {
            await onDelete();
            // Let the parent component handle navigation after deletion
        } catch (err) {
            console.error("Delete itinerary failed:", err);
            setIsDeleting(false);
        }
    };

    const handleBackToEdit = () => {
        setStep("edit");
    };

    // ─── Render ──────────────────────────────────────────────────────────────
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]" onClose={onClose}>
                {step === "edit" ? (
                    <form onSubmit={handleSave}>
                        <DialogHeader>
                            <DialogTitle>{t("title")}</DialogTitle>
                            <DialogDescription>{t("description")}</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label htmlFor="tripTitle" className="text-sm font-medium">
                                    {t("labelTitle")}
                                </label>
                                <Input
                                    ref={initialFocusRef}
                                    id="tripTitle"
                                    value={formData.title}
                                    onChange={(e) =>
                                        setFormData({ ...formData, title: e.target.value })
                                    }
                                    disabled={isSaving || isDeleting}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="tripDestination" className="text-sm font-medium">
                                    {t("labelDestination")}
                                </label>
                                <Input
                                    id="tripDestination"
                                    value={formData.destination}
                                    onChange={(e) =>
                                        setFormData({ ...formData, destination: e.target.value })
                                    }
                                    disabled={isSaving || isDeleting}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">
                                    {t("labelDates")}
                                </label>
                                <DateRangePicker
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={(start, end) => {
                                        setStartDate(start);
                                        setEndDate(end);
                                    }}
                                    disabled={isSaving || isDeleting}
                                />
                                {/* Inline shrink warning hint */}
                                {isShrinking && (
                                    <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="h-4 w-4 shrink-0" />
                                        {t("shrinkHint", { count: removedDayCount })}
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="tripRequirements" className="text-sm font-medium">
                                    {t("labelRequirements")}
                                </label>
                                <Textarea
                                    id="tripRequirements"
                                    value={formData.requirements}
                                    onChange={(e) =>
                                        setFormData({ ...formData, requirements: e.target.value })
                                    }
                                    disabled={isSaving || isDeleting}
                                    className="min-h-[100px]"
                                />
                            </div>
                        </div>
                        <DialogFooter className="flex-row items-center justify-between sm:justify-between w-full mt-4">
                            {onDelete ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setStep("confirm-delete")}
                                    disabled={isSaving || isDeleting}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t("deleteItinerary")}
                                </Button>
                            ) : (
                                <div />
                            )}
                            <Button type="submit" variant={isShrinking ? "destructive" : "default"} disabled={isSaving || isDeleting}>
                                {isSaving ? t("saving") : isShrinking
                                    ? t("saveAndShrink")
                                    : t("save")}
                            </Button>
                        </DialogFooter>
                    </form>
                ) : step === "confirm-delete" ? (
                    /* ── Confirm Delete step ── */
                    <div>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                {t("confirmDeleteItineraryTitle")}
                            </DialogTitle>
                            <DialogDescription>
                                {t("confirmDeleteItineraryDescription")}
                            </DialogDescription>
                        </DialogHeader>

                        <p className="text-sm text-muted-foreground my-4">
                            {t("confirmDeleteItineraryNote")}
                        </p>

                        <DialogFooter className="mt-6 gap-2">
                            <Button variant="outline" onClick={handleBackToEdit} disabled={isDeleting}>
                                {t("cancelDeleteItinerary")}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? t("saving") : t("confirmDeleteItinerary")}
                            </Button>
                        </DialogFooter>
                    </div>
                ) : (
                    /* ── Confirmation Shrink step ── */
                    <div>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                {t("confirmShrinkTitle")}
                            </DialogTitle>
                            <DialogDescription>
                                {t("confirmShrinkDescription", { count: removedDayCount })}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="my-4 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                            <p className="mb-2 text-sm font-medium text-destructive">
                                {t("affectedDaysLabel")}
                            </p>
                            <ul className="space-y-1">
                                {affectedDays.map((day) => (
                                    <li
                                        key={day.day_number}
                                        className="flex items-center justify-between text-sm"
                                    >
                                        <span className="font-medium">
                                            {t("dayLabel", { day: day.day_number })}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {t("activityCount", { count: day.activities.length })}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            {t("confirmShrinkNote")}
                        </p>

                        <DialogFooter className="mt-6 gap-2">
                            <Button variant="outline" onClick={handleBackToEdit} disabled={isSaving}>
                                {t("cancelShrink")}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleConfirmShrink}
                                disabled={isSaving}
                            >
                                {isSaving ? t("saving") : t("confirmShrink")}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
