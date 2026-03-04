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
import { parseLocalDate, formatLocalDate } from "@/lib/utils/date";
import type { Itinerary } from "@/types/itinerary";
import { useItineraryStore } from "../store";

interface EditMetadataDialogProps {
    itinerary: Itinerary;
    isOpen: boolean;
    onClose: () => void;
}

export function EditMetadataDialog({
    itinerary,
    isOpen,
    onClose,
}: EditMetadataDialogProps) {
    const t = useTranslations("planner.editMetadataDialog");
    const updateMetadata = useItineraryStore((state) => state.updateMetadata);
    const initialFocusRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: itinerary.title,
        destination: itinerary.destination,
        requirements: itinerary.requirements || "",
    });
    const [startDate, setStartDate] = useState<Date | undefined>(parseLocalDate(itinerary.start_date));
    const [endDate, setEndDate] = useState<Date | undefined>(parseLocalDate(itinerary.end_date));
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
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
        if (isOpen && initialFocusRef.current) {
            setTimeout(() => {
                initialFocusRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        if (!startDate || !endDate) {
            return; // Do not save without basic dates
        }

        setIsSaving(true);
        try {
            const formattedStart = formatLocalDate(startDate);
            const formattedEnd = formatLocalDate(endDate);

            await updateMetadata({
                title: formData.title,
                destination: formData.destination,
                start_date: formattedStart,
                end_date: formattedEnd,
                requirements: formData.requirements || undefined,
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]" onClose={onClose}>
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
                            />
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
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? t("saving") : t("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
