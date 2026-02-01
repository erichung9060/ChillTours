import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { itineraryArbitrary, dayArbitrary, activityArbitrary } from "../utils/property-test-helpers";
import { parseItineraryUpdate } from "@/lib/ai/parser";
import type { Itinerary, Day } from "@/types";

/**
 * Property-based tests for itinerary update parsing and application
 * Feature: tripai-travel-planner
 * 
 * These tests verify that AI responses containing itinerary modifications
 * are correctly parsed and can be applied to existing itineraries.
 */

/**
 * Apply partial updates to an itinerary
 * Filters out undefined values to avoid overwriting with undefined
 */
function applyItineraryUpdates(
  original: Itinerary,
  updates: Partial<Itinerary>
): Itinerary {
  // Filter out undefined values
  const filteredUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );

  return {
    ...original,
    ...filteredUpdates,
    updated_at: new Date().toISOString(),
  };
}

describe("Itinerary Update Parsing and Application Properties", () => {
  // Feature: tripai-travel-planner, Property 19: Itinerary Update Parsing and Application
  test("Property 19: For any AI response with itinerary updates, parsing should extract the changes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          destination: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          days: fc.option(fc.array(dayArbitrary, { minLength: 1, maxLength: 5 }), { nil: undefined }),
        }),
        async (updateData) => {
          // Create JSON response with updates
          const jsonResponse = JSON.stringify(updateData);

          // Parse the updates
          const parsed = parseItineraryUpdate(jsonResponse);

          // Property: Parsed updates should match input
          if (updateData.title !== undefined) {
            expect(parsed.title).toBe(updateData.title);
          }

          if (updateData.destination !== undefined) {
            expect(parsed.destination).toBe(updateData.destination);
          }

          if (updateData.days !== undefined) {
            expect(parsed.days).toBeDefined();
            expect(Array.isArray(parsed.days)).toBe(true);
            expect(parsed.days!.length).toBe(updateData.days.length);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 19.1: For any itinerary and valid updates, applying updates should produce a modified itinerary", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryArbitrary,
        fc.record({
          title: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          destination: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        }),
        async (original, updates) => {
          // Apply updates
          const modified = applyItineraryUpdates(original, updates);

          // Property: Original fields should be preserved if not updated
          expect(modified.id).toBe(original.id);
          expect(modified.user_id).toBe(original.user_id);
          expect(modified.start_date).toBe(original.start_date);
          expect(modified.end_date).toBe(original.end_date);

          // Property: Updated fields should reflect changes (only if defined)
          if (updates.title !== undefined) {
            expect(modified.title).toBe(updates.title);
          } else {
            expect(modified.title).toBe(original.title);
          }

          if (updates.destination !== undefined) {
            expect(modified.destination).toBe(updates.destination);
          } else {
            expect(modified.destination).toBe(original.destination);
          }

          // Property: updated_at should be changed
          expect(modified.updated_at).not.toBe(original.updated_at);
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 19.2: For any day updates, parsing should preserve activity structure", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(dayArbitrary, { minLength: 1, maxLength: 5 }),
        async (days) => {
          // Create JSON response with day updates
          const jsonResponse = JSON.stringify({ days });

          // Parse the updates
          const parsed = parseItineraryUpdate(jsonResponse);

          // Property: Days should be parsed
          expect(parsed.days).toBeDefined();
          expect(Array.isArray(parsed.days)).toBe(true);
          expect(parsed.days!.length).toBe(days.length);

          // Property: Each day should preserve structure
          parsed.days!.forEach((parsedDay, index) => {
            expect(parsedDay.day_number).toBe(days[index].day_number);
            expect(Array.isArray(parsedDay.activities)).toBe(true);
            expect(parsedDay.activities.length).toBe(days[index].activities.length);

            // Property: Each activity should preserve structure
            parsedDay.activities.forEach((activity, actIndex) => {
              const originalActivity = days[index].activities[actIndex];
              expect(activity.title).toBe(originalActivity.title);
              expect(activity.time).toBe(originalActivity.time);
              expect(activity.description).toBe(originalActivity.description);
              expect(activity.location.name).toBe(originalActivity.location.name);
              // Use toBeCloseTo for floating point comparison to handle -0 vs +0
              expect(activity.location.lat).toBeCloseTo(originalActivity.location.lat, 10);
              expect(activity.location.lng).toBeCloseTo(originalActivity.location.lng, 10);
            });
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 19.3: For any malformed update JSON, parsing should not throw and return empty object", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          "not json",
          "{incomplete",
          '{"title": }',
          "",
          "null",
          "undefined"
        ),
        async (malformedJSON) => {
          // Property: Parsing should not throw
          expect(() => parseItineraryUpdate(malformedJSON)).not.toThrow();

          // Parse the malformed JSON
          const parsed = parseItineraryUpdate(malformedJSON);

          // Property: Should return empty object or partial data
          expect(typeof parsed).toBe("object");
          expect(parsed).not.toBeNull();
        }
      ),
      { numRuns: 10 }
    );
  });

  test("Property 19.4: For any update with new activities, applying should add them to the itinerary", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryArbitrary,
        fc.array(activityArbitrary, { minLength: 1, maxLength: 3 }),
        async (original, newActivities) => {
          // Assume we're adding activities to the first day
          if (original.days.length === 0) {
            return; // Skip if no days
          }

          const firstDay = original.days[0];
          const updatedDay: Day = {
            ...firstDay,
            activities: [...firstDay.activities, ...newActivities],
          };

          const updates: Partial<Itinerary> = {
            days: [updatedDay, ...original.days.slice(1)],
          };

          // Apply updates
          const modified = applyItineraryUpdates(original, updates);

          // Property: First day should have more activities
          expect(modified.days[0].activities.length).toBe(
            firstDay.activities.length + newActivities.length
          );

          // Property: New activities should be present
          const modifiedActivities = modified.days[0].activities;
          newActivities.forEach((newActivity) => {
            const found = modifiedActivities.some(
              (a) => a.title === newActivity.title && a.time === newActivity.time
            );
            expect(found).toBe(true);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 19.5: For any update, the original itinerary should remain unchanged (immutability)", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryArbitrary,
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          destination: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (original, updates) => {
          // Create a deep copy to compare later
          const originalCopy = JSON.parse(JSON.stringify(original));

          // Apply updates
          applyItineraryUpdates(original, updates);

          // Property: Original should remain unchanged
          expect(original.title).toBe(originalCopy.title);
          expect(original.destination).toBe(originalCopy.destination);
          expect(original.days.length).toBe(originalCopy.days.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});
