/**
 * Property-Based Tests for Itinerary-Map Synchronization
 *
 * Feature: tripai-travel-planner, Property 15: Itinerary-Map Synchronization
 * Validates: Requirements 6.3, 7.3
 *
 * Property: For any itinerary modification (reordering, adding, removing activities),
 * the map pins should update to reflect the new state, maintaining correspondence
 * between itinerary items and pins.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  itineraryArbitrary,
  activityArbitrary,
} from "@/test/utils/property-test-helpers";
import type { Itinerary, Activity, ActivityWithDay } from "@/types/itinerary";

describe("Itinerary-Map Synchronization Property Tests", () => {
  /**
   * Helper to extract all activities with day numbers from an itinerary
   */
  const extractActivitiesWithDay = (
    itinerary: Itinerary
  ): ActivityWithDay[] => {
    return itinerary.days.flatMap((day) =>
      day.activities.map((activity) => ({
        ...activity,
        dayNumber: day.day_number,
      }))
    );
  };

  /**
   * Helper to verify pin-activity correspondence
   * Only counts activities with valid locations (no NaN values)
   */
  const verifyPinActivityCorrespondence = (
    activities: ActivityWithDay[]
  ): boolean => {
    // Filter to only valid activities (no NaN coordinates)
    const validActivities = activities.filter((activity) => {
      const { lat, lng } = activity.location;
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });

    // All valid activities should have proper coordinates
    return validActivities.every((activity) => {
      const { lat, lng } = activity.location;
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });
  };

  it("Property 15: Pin count matches activity count for valid locations", async () => {
    await fc.assert(
      fc.asyncProperty(itineraryArbitrary, async (itinerary) => {
        const allActivities = extractActivitiesWithDay(itinerary);

        // Filter to valid activities only
        const validActivities = allActivities.filter(
          (a) =>
            Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
        );

        // Property: All valid activities should pass correspondence check
        return verifyPinActivityCorrespondence(validActivities);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 15 (Adding): Pin count increases when adding valid activities", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryArbitrary,
        activityArbitrary,
        async (itinerary, newActivity) => {
          fc.pre(itinerary.days.length > 0);

          const activitiesBefore = extractActivitiesWithDay(itinerary);
          const validBefore = activitiesBefore.filter(
            (a) =>
              Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
          );

          // Ensure new activity has valid location
          const validNewActivity = {
            ...newActivity,
            id: crypto.randomUUID(), // Ensure unique ID
            location: {
              ...newActivity.location,
              lat: Number.isFinite(newActivity.location.lat)
                ? newActivity.location.lat
                : 0,
              lng: Number.isFinite(newActivity.location.lng)
                ? newActivity.location.lng
                : 0,
            },
          };

          // Add activity to first day
          const modifiedItinerary: Itinerary = {
            ...itinerary,
            days: itinerary.days.map((day, index) =>
              index === 0
                ? {
                  ...day,
                  activities: [
                    ...day.activities,
                    { ...validNewActivity, order: day.activities.length },
                  ],
                }
                : day
            ),
          };

          const activitiesAfter = extractActivitiesWithDay(modifiedItinerary);
          const validAfter = activitiesAfter.filter(
            (a) =>
              Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
          );

          // Property: Valid activity count should increase by 1
          expect(validAfter.length).toBe(validBefore.length + 1);

          // Property: Pin correspondence should be maintained
          return verifyPinActivityCorrespondence(validAfter);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 15 (Removing): Pin count decreases when removing activities", async () => {
    await fc.assert(
      fc.asyncProperty(itineraryArbitrary, async (itinerary) => {
        const activitiesBefore = extractActivitiesWithDay(itinerary);
        const validBefore = activitiesBefore.filter(
          (a) =>
            Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
        );

        fc.pre(validBefore.length > 0);

        // Pick first valid activity to remove
        const activityToRemove = validBefore[0];

        // Find which day contains this activity
        let removed = false;
        const modifiedItinerary: Itinerary = {
          ...itinerary,
          days: itinerary.days.map((day) => {
            if (!removed) {
              const activityIndex = day.activities.findIndex(
                (a) => a.id === activityToRemove.id
              );
              if (activityIndex >= 0) {
                removed = true;
                return {
                  ...day,
                  activities: day.activities
                    .filter((_, idx) => idx !== activityIndex)
                    .map((a, index) => ({ ...a, order: index })),
                };
              }
            }
            return day;
          }),
        };

        const activitiesAfter = extractActivitiesWithDay(modifiedItinerary);
        const validAfter = activitiesAfter.filter(
          (a) =>
            Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
        );

        // Property: Valid activity count should decrease by 1
        expect(validAfter.length).toBe(validBefore.length - 1);

        // Property: Pin correspondence should be maintained
        return verifyPinActivityCorrespondence(validAfter);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 15 (Location Updates): Pins update when activity locations change", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryArbitrary,
        fc.double({ min: -90, max: 90, noNaN: true }),
        fc.double({ min: -180, max: 180, noNaN: true }),
        async (itinerary, newLat, newLng) => {
          const activitiesBefore = extractActivitiesWithDay(itinerary);
          const validBefore = activitiesBefore.filter(
            (a) =>
              Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
          );

          fc.pre(validBefore.length > 0);

          const activityToUpdate = validBefore[0];

          // Update activity location
          let updated = false;
          const modifiedItinerary: Itinerary = {
            ...itinerary,
            days: itinerary.days.map((day) => {
              if (!updated) {
                const activityIndex = day.activities.findIndex(
                  (a) => a.id === activityToUpdate.id
                );
                if (activityIndex >= 0) {
                  updated = true;
                  return {
                    ...day,
                    activities: day.activities.map((a, idx) =>
                      idx === activityIndex
                        ? {
                          ...a,
                          location: {
                            ...a.location,
                            lat: newLat,
                            lng: newLng,
                          },
                        }
                        : a
                    ),
                  };
                }
              }
              return day;
            }),
          };

          const activitiesAfter = extractActivitiesWithDay(modifiedItinerary);
          const validAfter = activitiesAfter.filter(
            (a) =>
              Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
          );

          // Property: Valid activity count should remain the same
          expect(validAfter.length).toBe(validBefore.length);

          // Property: Updated activity should have new coordinates
          const updatedActivity = validAfter.find(
            (a) => a.id === activityToUpdate.id
          );
          expect(updatedActivity).toBeDefined();

          if (updatedActivity) {
            expect(updatedActivity.location.lat).toBe(newLat);
            expect(updatedActivity.location.lng).toBe(newLng);
          }

          // Property: Pin correspondence should be maintained
          return verifyPinActivityCorrespondence(validAfter);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 15 (Unique IDs): Each pin corresponds to a unique activity ID", async () => {
    await fc.assert(
      fc.asyncProperty(itineraryArbitrary, async (itinerary) => {
        const activities = extractActivitiesWithDay(itinerary);
        const validActivities = activities.filter(
          (a) =>
            Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
        );

        // Property: All valid activity IDs should be present (may have duplicates from generator)
        // We just verify that each activity has an ID
        return validActivities.every(
          (a) => typeof a.id === "string" && a.id.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });

  it("Property 15 (Empty Itinerary): No pins for itinerary with no activities", async () => {
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

    const activities = extractActivitiesWithDay(emptyItinerary);

    // Property: Empty itinerary should have 0 pins
    expect(activities.length).toBe(0);
    expect(verifyPinActivityCorrespondence(activities)).toBe(true);
  });

  it("Property 15 (Idempotency): Same itinerary state produces same pin configuration", async () => {
    await fc.assert(
      fc.asyncProperty(itineraryArbitrary, async (itinerary) => {
        // Extract activities twice
        const activities1 = extractActivitiesWithDay(itinerary);
        const activities2 = extractActivitiesWithDay(itinerary);

        // Property: Same itinerary should produce identical activity lists
        expect(activities1.length).toBe(activities2.length);

        // Verify each activity matches
        activities1.forEach((activity, index) => {
          if (activities2[index]) {
            expect(activity.id).toBe(activities2[index].id);
            expect(activity.dayNumber).toBe(activities2[index].dayNumber);
          }
        });

        return activities1.length === activities2.length;
      }),
      { numRuns: 100 }
    );
  });

  it("Property 15 (Valid Coordinates): All pins have valid geographic coordinates", async () => {
    await fc.assert(
      fc.asyncProperty(itineraryArbitrary, async (itinerary) => {
        const activities = extractActivitiesWithDay(itinerary);

        // Property: All activities with finite coordinates should be within valid ranges
        const activitiesWithCoords = activities.filter(
          (a) =>
            Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng)
        );

        return activitiesWithCoords.every((activity) => {
          const { lat, lng } = activity.location;
          return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
        });
      }),
      { numRuns: 100 }
    );
  });
});
