'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Activity } from '@/types/itinerary';

interface EditActivityDialogProps {
    activity: Activity;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedActivity: Activity) => void;
}

export function EditActivityDialog({
    activity,
    isOpen,
    onClose,
    onSave,
}: EditActivityDialogProps) {
    const initialFocusRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: activity.title,
        locationName: activity.location.name,
        description: activity.description || '',
        time: activity.time,
        duration: activity.duration_minutes,
        url: activity.url || '',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                title: activity.title,
                locationName: activity.location.name,
                description: activity.description || '',
                time: activity.time,
                duration: activity.duration_minutes,
                url: activity.url || '',
            });
        }
    }, [activity, isOpen]);

    useEffect(() => {
        if (isOpen && initialFocusRef.current) {
            setTimeout(() => {
                initialFocusRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    const handleSave = () => {
        const updatedActivity: Activity = {
            ...activity,
            title: formData.title,
            location: {
                ...activity.location,
                name: formData.locationName,
            },
            description: formData.description,
            time: formData.time,
            duration_minutes: Number(formData.duration),
            url: formData.url || undefined,
        };
        onSave(updatedActivity);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <form onSubmit={handleSave}>
                    <DialogHeader>
                        <DialogTitle>Edit Activity</DialogTitle>
                        <DialogDescription>
                            Make changes to your activity here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="title" className="text-sm font-medium">
                                Title
                            </label>
                            <Input
                                ref={initialFocusRef}
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="location" className="text-sm font-medium">
                                Location
                            </label>
                            <Input
                                id="location"
                                value={formData.locationName}
                                onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <label htmlFor="time" className="text-sm font-medium">
                                    Time
                                </label>
                                <Input
                                    id="time"
                                    type="time"
                                    value={formData.time}
                                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <label htmlFor="duration" className="text-sm font-medium">
                                    Duration (min)
                                </label>
                                <Input
                                    id="duration"
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="url" className="text-sm font-medium">
                                URL
                            </label>
                            <Input
                                id="url"
                                value={formData.url}
                                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="description" className="text-sm font-medium">
                                Description
                            </label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
