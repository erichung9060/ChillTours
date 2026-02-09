"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDestinations } from "./trending-destinations";
import { DateRangePicker } from "./date-range-picker";

export function TripForm() {
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [vibe, setVibe] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    destination?: string;
    dates?: string;
  }>({});

  const validateForm = () => {
    const newErrors: { destination?: string; dates?: string } = {};

    // Validate destination (required, non-empty)
    if (!destination.trim()) {
      newErrors.destination = "Destination is required";
    }

    // Validate dates
    if (!startDate || !endDate) {
      newErrors.dates = "Please select your travel dates";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    // Format dates for API
    const formattedStart = startDate?.toISOString().split("T")[0];
    const formattedEnd = endDate?.toISOString().split("T")[0];

    // TODO: Navigate to planning interface with form data
    // For now, just simulate loading
    setTimeout(() => {
      console.log("Form submitted:", {
        destination,
        startDate: formattedStart,
        endDate: formattedEnd,
        vibe,
      });
      setIsLoading(false);
      // router.push(`/plan/new?destination=${encodeURIComponent(destination)}&startDate=${formattedStart}&endDate=${formattedEnd}&vibe=${encodeURIComponent(vibe)}`);
    }, 1000);
  };

  const handleDestinationClick = (dest: string) => {
    setDestination(dest);
    // Clear destination error if it exists
    if (errors.destination) {
      setErrors({ ...errors, destination: undefined });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            {/* Destination Input */}
            <div className="flex-1">
              <label
                htmlFor="destination"
                className="block text-sm font-medium mb-2 text-foreground/80"
              >
                Where to next?
              </label>
              <div className="relative">
                <span className="absolute left-3 top-5 -translate-y-1/2 text-muted-foreground">
                  📍
                </span>
                <Input
                  id="destination"
                  type="text"
                  placeholder="e.g. Tokyo, Bali, Paris"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  error={!!errors.destination}
                  helperText={errors.destination}
                  disabled={isLoading}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range Picker */}
            <div className="min-w-[300px]">
              <label className="block text-sm font-medium mb-2 text-foreground/80">
                When are you going?
              </label>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(start, end) => {
                  setStartDate(start);
                  setEndDate(end);
                  if (start && end && errors.dates) {
                    setErrors({ ...errors, dates: undefined });
                  }
                }}
              />
              {errors.dates && (
                <p className="text-xs text-destructive mt-1">{errors.dates}</p>
              )}
            </div>
          </div>

          {/* Vibe/Custom Requirements Textarea */}
          <div>
            <label
              htmlFor="vibe"
              className="block text-sm font-medium mb-2 text-foreground/80"
            >
              Describe your vibe
            </label>
            <Textarea
              id="vibe"
              placeholder="Budget-friendly foodie tour, hiking spots, vintage shopping..."
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              disabled={isLoading}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                Generate Free Itinerary
              </span>
            )}
          </Button>
        </form>

        {/* Trending Destinations */}
        <TrendingDestinations onDestinationClick={handleDestinationClick} />
      </CardContent>
    </Card>
  );
}
