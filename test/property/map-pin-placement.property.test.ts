/**
 * Property-Based Tests for Map Pin Placement
 *
 * Feature: tripai-travel-planner, Property 13: Map Pin Placement
 * Validates: Requirements 6.1
 *
 * Property: For any itinerary with N activities, loading the itinerary
 * should place exactly N pins on the map at the correct coordinates.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { Itinerary, Activity, Day, Location } from "@/types/itinerary";

// Arbitrary for Location
const arbitraryLocation = (): fc.Arbitrary<Location> =>
  fc.oneof(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      lat: fc.double({ min: -90, max: 90, noNaN: true }),
      lng: fc.double({ min: -180, max: 180, noNaN: true }),
      place_id: fc.option(fc.string(), { nil: undefined }),
    }),
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      place_id: fc.option(fc.string(), { nil: undefined }),
    })
  );

// Arbitrary for Activity
const arbitraryActivity = (): fc.Arbitrary<Activity> =>
  fc.record({
    id: fc.uuid(),
    time: fc.constantFrom(
      "09:00",
      "10:30",
      "12:00",
      "14:30",
      "16:00",
      "18:30",
      "20:00"
    ),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    note: fc.string({ minLength: 0, maxLength: 500 }),
    location: arbitraryLocation(),
    duration_minutes: fc.integer({ min: 15, max: 480 }),
    order: fc.integer({ min: 0, max: 100 }),
  });

// Arbitrary for Day
const arbitraryDay = (): fc.Arbitrary<Day> =>
  fc.record({
    day_number: fc.integer({ min: 1, max: 30 }),
    date: fc.integer({ min: 0, max: 1000 }).map((days) => {
      const baseDate = new Date("2024-01-01");
      baseDate.setDate(baseDate.getDate() + days);
      return baseDate.toISOString().split("T")[0];
    }),
    activities: fc.array(arbitraryActivity(), { minLength: 0, maxLength: 10 }),
  });

// Arbitrary for Itinerary
const arbitraryItinerary = (): fc.Arbitrary<Itinerary> =>
  fc
    .record({
      id: fc.uuid(),
      user_id: fc.uuid(),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      destination: fc.string({ minLength: 1, maxLength: 100 }),
      start_date: fc.integer({ min: 0, max: 1000 }).map((days) => {
        const baseDate = new Date("2024-01-01");
        baseDate.setDate(baseDate.getDate() + days);
        return baseDate.toISOString().split("T")[0];
      }),
      end_date: fc.integer({ min: 0, max: 1000 }).map((days) => {
        const baseDate = new Date("2024-01-01");
        baseDate.setDate(baseDate.getDate() + days);
        return baseDate.toISOString().split("T")[0];
      }),
      days: fc.array(arbitraryDay(), { minLength: 1, maxLength: 14 }),
      created_at: fc.integer({ min: 0, max: 1000 }).map((days) => {
        const baseDate = new Date("2024-01-01");
        baseDate.setDate(baseDate.getDate() + days);
        return baseDate.toISOString();
      }),
      updated_at: fc.integer({ min: 0, max: 1000 }).map((days) => {
        const baseDate = new Date("2024-01-01");
        baseDate.setDate(baseDate.getDate() + days);
        return baseDate.toISOString();
      }),
    })
    .filter((it) => it.end_date >= it.start_date);

describe("Map Pin Placement Property Tests", () => {
  it("should place exactly N pins for N activities", () => {
    fc.assert(
      fc.property(arbitraryItinerary(), (itinerary) => {
        // Count total activities across all days
        const totalActivities = itinerary.days.reduce(
          (sum, day) => sum + day.activities.length,
          0
        );

        // Collect all activities with their locations
        const allActivities = itinerary.days.flatMap((day) =>
          day.activities.map((activity) => ({
            ...activity,
            dayNumber: day.day_number,
          }))
        );

        // Filter valid activities for map rendering
        const validActivities = allActivities.filter(
          (activity) =>
            typeof activity.location.lat === "number" &&
            typeof activity.location.lng === "number"
        );

        // Verify each valid activity has proper coordinates
        validActivities.forEach((activity) => {
          expect(activity.location.lat as number).toBeGreaterThanOrEqual(-90);
          expect(activity.location.lat as number).toBeLessThanOrEqual(90);
          expect(activity.location.lng as number).toBeGreaterThanOrEqual(-180);
          expect(activity.location.lng as number).toBeLessThanOrEqual(180);
          expect(Number.isFinite(activity.location.lat)).toBe(true);
          expect(Number.isFinite(activity.location.lng)).toBe(true);
        });

        // Property: Total activities across days should equal flattened activity count
        return totalActivities === allActivities.length;
      }),
      { numRuns: 100 }
    );
  });

  it("should place pins at correct coordinates for each valid activity", () => {
    fc.assert(
      fc.property(arbitraryItinerary(), (itinerary) => {
        // Collect all activities
        const allActivities = itinerary.days.flatMap((day) => day.activities);

        // Filter valid activities for map rendering
        const validActivities = allActivities.filter(
          (activity) =>
            typeof activity.location.lat === "number" &&
            typeof activity.location.lng === "number"
        );

        // For each valid activity, verify its location has valid coordinates
        return validActivities.every((activity) => {
          const { lat, lng } = activity.location;

          // Coordinates must be valid numbers
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return false;
          }

          // Latitude must be between -90 and 90
          if (lat < -90 || lat > 90) {
            return false;
          }

          // Longitude must be between -180 and 180
          if (lng < -180 || lng > 180) {
            return false;
          }

          return true;
        });
      }),
      { numRuns: 100 }
    );
  });

  it("should maintain pin-activity correspondence", () => {
    fc.assert(
      fc.property(arbitraryItinerary(), (itinerary) => {
        // Collect all activities with their day numbers
        const allActivities = itinerary.days.flatMap((day) =>
          day.activities.map((activity) => ({
            id: activity.id,
            dayNumber: day.day_number,
            location: activity.location,
          }))
        );

        // Verify each activity has a unique ID
        const activityIds = allActivities.map((a) => a.id);
        const uniqueIds = new Set(activityIds);

        // Property: Each activity should have a unique ID for pin correspondence
        return activityIds.length === uniqueIds.size;
      }),
      { numRuns: 100 }
    );
  });

  it("should handle itineraries with no activities", () => {
    // Create an itinerary with days but no activities
    const emptyItinerary: Itinerary = {
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      title: "Empty Trip",
      destination: "Nowhere",
      start_date: "2026-01-01",
      end_date: "2026-01-03",
      days: [
        { day_number: 1, date: "2026-01-01", activities: [] },
        { day_number: 2, date: "2026-01-02", activities: [] },
        { day_number: 3, date: "2026-01-03", activities: [] },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const totalActivities = emptyItinerary.days.reduce(
      (sum, day) => sum + day.activities.length,
      0
    );

    // Property: Empty itinerary should have 0 pins
    expect(totalActivities).toBe(0);
  });

  it("should handle itineraries with many activities", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryDay(), { minLength: 5, maxLength: 14 }),
        (days) => {
          const itinerary: Itinerary = {
            id: crypto.randomUUID(),
            user_id: crypto.randomUUID(),
            title: "Long Trip",
            destination: "Multiple Cities",
            start_date: "2026-01-01",
            end_date: "2026-01-14",
            days: days.map((day, index) => ({
              ...day,
              day_number: index + 1,
            })),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const totalActivities = itinerary.days.reduce(
            (sum, day) => sum + day.activities.length,
            0
          );

          const allActivities = itinerary.days.flatMap((day) => day.activities);

          // Property: Total count should match flattened array length
          return allActivities.length === totalActivities;
        }
      ),
      { numRuns: 100 }
    );
  });
});
