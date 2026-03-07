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
import type { Activity } from "@/types/itinerary";
import { useItineraryStore } from "../store";

interface AddActivityDialogProps {
    dayNumber: number;
    insertionIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

export function AddActivityDialog({
    dayNumber,
    insertionIndex,
    isOpen,
    onClose,
}: AddActivityDialogProps) {
    const t = useTranslations("planner.addDialog");
    const initialFocusRef = useRef<HTMLInputElement>(null);
    const locationTouched = useRef(false);
    const isSaving = useItineraryStore((state) => state.isSaving);
    const addActivity = useItineraryStore((state) => state.addActivity);

    const [formData, setFormData] = useState({
        title: "",
        locationName: "",
        note: "",
        time: "09:00",
        duration: 60,
        url: "",
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: "",
                locationName: "",
                note: "",
                time: "09:00",
                duration: 60,
                url: "",
            });
            locationTouched.current = false;
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && initialFocusRef.current) {
            setTimeout(() => {
                initialFocusRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setFormData((prev) => ({
            ...prev,
            title: newTitle,
            locationName: locationTouched.current ? prev.locationName : newTitle,
        }));
    };

    const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        locationTouched.current = true;
        setFormData((prev) => ({ ...prev, locationName: e.target.value }));
    };

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const newActivity: Activity = {
            id: crypto.randomUUID(),
            title: formData.title,
            location: {
                name: formData.locationName,
                lat: 0,
                lng: 0,
            },
            note: formData.note,
            time: formData.time,
            duration_minutes: Number(formData.duration),
            url: formData.url || undefined,
            order: insertionIndex,
        };
        try {
            await addActivity(dayNumber, newActivity, insertionIndex);
            onClose();
        } catch (err) {
            console.error("Add activity failed:", err);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]" onClose={onClose}>
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
                                onChange={handleTitleChange}
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
                                onChange={handleLocationChange}
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
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            {t("cancel")}
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? t("saving") : t("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
