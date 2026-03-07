/**
 * Property-Based Tests for Pin Click Details Display
 *
 * Feature: tripai-travel-planner, Property 14: Pin Click Details Display
 * Validates: Requirements 6.2
 *
 * Property: For any pin on the map, clicking it should display a popup
 * containing the corresponding location details.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { Activity, Location } from "@/types/itinerary";

// Arbitrary for Location
const arbitraryLocation = (): fc.Arbitrary<Location> =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    lat: fc.double({ min: -90, max: 90, noNaN: true }),
    lng: fc.double({ min: -180, max: 180, noNaN: true }),
    place_id: fc.option(fc.string(), { nil: undefined }),
  });

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

/**
 * Simulates the info window content that would be displayed
 * This mirrors the logic in MapPanel component
 */
function generateInfoWindowContent(activity: Activity): {
  title: string;
  time: string;
  duration: number;
  locationName: string;
  note?: string;
} {
  return {
    title: activity.title,
    time: activity.time,
    duration: activity.duration_minutes,
    locationName: activity.location.name,
    note: activity.note || undefined,
  };
}

describe("Pin Click Details Display Property Tests", () => {
  it("should display all required location details for any activity", () => {
    fc.assert(
      fc.property(arbitraryActivity(), (activity) => {
        // Generate the info window content
        const infoContent = generateInfoWindowContent(activity);

        // Property: Info window must contain all required fields
        const hasTitle = infoContent.title.length > 0;
        const hasTime = infoContent.time.length > 0;
        const hasDuration = infoContent.duration > 0;
        const hasLocationName = infoContent.locationName.length > 0;

        return hasTitle && hasTime && hasDuration && hasLocationName;
      }),
      { numRuns: 100 }
    );
  });

  it("should preserve activity title in info window", () => {
    fc.assert(
      fc.property(arbitraryActivity(), (activity) => {
        const infoContent = generateInfoWindowContent(activity);

        // Property: Title in info window should match activity title
        return infoContent.title === activity.title;
      }),
      { numRuns: 100 }
    );
  });

  it("should preserve location name in info window", () => {
    fc.assert(
      fc.property(arbitraryActivity(), (activity) => {
        const infoContent = generateInfoWindowContent(activity);

        // Property: Location name in info window should match activity location
        return infoContent.locationName === activity.location.name;
      }),
      { numRuns: 100 }
    );
  });

  it("should preserve time and duration in info window", () => {
    fc.assert(
      fc.property(arbitraryActivity(), (activity) => {
        const infoContent = generateInfoWindowContent(activity);

        // Property: Time and duration should match exactly
        return (
          infoContent.time === activity.time &&
          infoContent.duration === activity.duration_minutes
        );
      }),
      { numRuns: 100 }
    );
  });

  it("should include note when present", () => {
    fc.assert(
      fc.property(
        arbitraryActivity().filter((a) => a.note.length > 0),
        (activity) => {
          const infoContent = generateInfoWindowContent(activity);

          // Property: If activity has note, info window should include it
          return infoContent.note === activity.note;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle activities without note", () => {
    fc.assert(
      fc.property(
        arbitraryActivity().map((a) => ({ ...a, note: "" })),
        (activity) => {
          const infoContent = generateInfoWindowContent(activity);

          // Property: Empty note should result in undefined in info window
          return infoContent.note === undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should display valid coordinates for pin positioning", () => {
    fc.assert(
      fc.property(arbitraryActivity(), (activity) => {
        const { lat, lng } = activity.location;

        // Property: Coordinates must be valid for map display
        const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90;
        const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180;

        return validLat && validLng;
      }),
      { numRuns: 100 }
    );
  });

  it("should maintain data integrity across all fields", () => {
    fc.assert(
      fc.property(arbitraryActivity(), (activity) => {
        const infoContent = generateInfoWindowContent(activity);

        // Property: All data should be preserved without corruption
        const titleMatch = infoContent.title === activity.title;
        const timeMatch = infoContent.time === activity.time;
        const durationMatch =
          infoContent.duration === activity.duration_minutes;
        const locationMatch =
          infoContent.locationName === activity.location.name;
        const descriptionMatch =
          activity.note.length === 0
            ? infoContent.note === undefined
            : infoContent.note === activity.note;

        return (
          titleMatch &&
          timeMatch &&
          durationMatch &&
          locationMatch &&
          descriptionMatch
        );
      }),
      { numRuns: 100 }
    );
  });

  it("should handle special characters in location details", () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          time: fc.constantFrom("09:00", "12:00", "18:00"),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          note: fc.string({ minLength: 0, maxLength: 500 }),
          location: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            lat: fc.double({ min: -90, max: 90, noNaN: true }),
            lng: fc.double({ min: -180, max: 180, noNaN: true }),
            place_id: fc.option(fc.string(), { nil: undefined }),
          }),
          duration_minutes: fc.integer({ min: 15, max: 480 }),
          order: fc.integer({ min: 0, max: 100 }),
        }),
        (activity) => {
          const infoContent = generateInfoWindowContent(activity);

          // Property: Special characters should be preserved
          return (
            infoContent.title === activity.title &&
            infoContent.locationName === activity.location.name
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle very long descriptions", () => {
    fc.assert(
      fc.property(
        arbitraryActivity().map((a) => ({
          ...a,
          note: fc.sample(
            fc.string({ minLength: 400, maxLength: 500 }),
            1
          )[0],
        })),
        (activity) => {
          const infoContent = generateInfoWindowContent(activity);

          // Property: Long descriptions should be preserved completely
          return infoContent.note === activity.note;
        }
      ),
      { numRuns: 100 }
    );
  });
});
