import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import type { Itinerary, Day, Activity } from "../../types";

/**
 * Property-based tests for itinerary parsing completeness
 * Feature: tripai-travel-planner
 */

// Mock parser that simulates parsing AI response into Itinerary structure
function parseItinerary(aiResponse: string): Itinerary | null {
  try {
    // Remove markdown code blocks if present
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    // Transform to Itinerary structure
    const now = new Date().toISOString();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7);

    const days: Day[] = (parsed.days || []).map(
      (day: any, dayIndex: number) => ({
        day_number: day.day_number || dayIndex + 1,
        activities: (day.activities || []).map(
          (activity: any, actIndex: number) => ({
            id: activity.id || crypto.randomUUID(),
            time: activity.time || "09:00",
            title: activity.title || "Untitled Activity",
            note: activity.note || "",
            location: {
              name: activity.location?.name || "Unknown Location",
              lat: activity.location?.lat || 0,
              lng: activity.location?.lng || 0,
              place_id: activity.location?.place_id,
            },
            duration_minutes: activity.duration_minutes || 120,
            order: actIndex,
          })
        ),
      })
    );

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days.length - 1);

    return {
      id: parsed.id || crypto.randomUUID(),
      user_id: parsed.user_id || crypto.randomUUID(),
      title: parsed.title || "Untitled Trip",
      destination: parsed.destination || "Unknown",
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      days,
      created_at: now,
      updated_at: now,
    };
  } catch (error) {
    return null;
  }
}

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split("T")[0];
}

// Generate a valid AI response JSON
function generateAIResponse(
  destination: string,
  numDays: number,
  activitiesPerDay: number
): string {
  const days = Array.from({ length: numDays }, (_, dayIndex) => ({
    day_number: dayIndex + 1,
    activities: Array.from({ length: activitiesPerDay }, (_, actIndex) => ({
      id: crypto.randomUUID(),
      time: `${(9 + actIndex * 2).toString().padStart(2, "0")}:00`,
      title: `Activity ${actIndex + 1}`,
      note: `Note for activity ${actIndex + 1}`,
      location: {
        name: `Location ${actIndex + 1}`,
        lat: 40.7128 + actIndex * 0.01,
        lng: -74.006 + actIndex * 0.01,
      },
      duration_minutes: 120,
    })),
  }));

  return JSON.stringify({
    title: `Trip to ${destination}`,
    destination,
    days,
  });
}

describe("Itinerary Parsing Completeness Properties", () => {
  // Feature: tripai-travel-planner, Property 8: Itinerary Parsing Completeness
  test("Property 8: For any valid AI response, parsing should extract all days without data loss", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 7 }),
        fc.integer({ min: 1, max: 5 }),
        async (destination, numDays, activitiesPerDay) => {
          // Generate valid AI response
          const aiResponse = generateAIResponse(
            destination,
            numDays,
            activitiesPerDay
          );

          // Parse the response
          const itinerary = parseItinerary(aiResponse);

          // Property: Parsing should succeed
          expect(itinerary).not.toBeNull();

          if (itinerary) {
            // Property: All days should be extracted
            expect(itinerary.days.length).toBe(numDays);

            // Property: Destination should be preserved
            expect(itinerary.destination).toBe(destination);

            // Property: Each day should have correct number of activities
            itinerary.days.forEach((day) => {
              expect(day.activities.length).toBe(activitiesPerDay);
            });
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 8.1: Parsing should extract all activity fields without data loss", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 1, max: 3 }),
        async (destination, numDays) => {
          const aiResponse = generateAIResponse(destination, numDays, 3);
          const itinerary = parseItinerary(aiResponse);

          expect(itinerary).not.toBeNull();

          if (itinerary) {
            // Property: All activities should have required fields
            itinerary.days.forEach((day) => {
              day.activities.forEach((activity) => {
                // Check all required fields are present
                expect(activity.id).toBeDefined();
                expect(activity.time).toBeDefined();
                expect(activity.title).toBeDefined();
                expect(activity.note).toBeDefined();
                expect(activity.location).toBeDefined();
                expect(activity.location.name).toBeDefined();
                expect(activity.location.lat).toBeDefined();
                expect(activity.location.lng).toBeDefined();
                expect(activity.duration_minutes).toBeDefined();
                expect(activity.order).toBeDefined();
              });
            });
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 8.2: Parsing should handle markdown-wrapped JSON", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .string({ minLength: 1, maxLength: 50 })
          .filter((s) => s.trim().length > 0),
        fc.constantFrom(
          { prefix: "```json\n", suffix: "\n```" },
          { prefix: "```\n", suffix: "\n```" },
          { prefix: "", suffix: "" }
        ),
        async (destination, wrapping) => {
          const baseResponse = generateAIResponse(destination, 2, 2);
          const wrappedResponse =
            wrapping.prefix + baseResponse + wrapping.suffix;

          const itinerary = parseItinerary(wrappedResponse);

          // Property: Parsing should succeed regardless of markdown wrapping
          expect(itinerary).not.toBeNull();

          if (itinerary) {
            expect(itinerary.destination).toBe(destination);
            expect(itinerary.days.length).toBe(2);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 8.3: Parsing should preserve location coordinates", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (destination) => {
          const aiResponse = generateAIResponse(destination, 2, 2);
          const originalData = JSON.parse(aiResponse);
          const itinerary = parseItinerary(aiResponse);

          expect(itinerary).not.toBeNull();

          if (itinerary) {
            // Property: GPS coordinates should be preserved
            itinerary.days.forEach((day, dayIndex) => {
              day.activities.forEach((activity, actIndex) => {
                const originalActivity =
                  originalData.days[dayIndex].activities[actIndex];
                expect(activity.location.lat).toBe(
                  originalActivity.location.lat
                );
                expect(activity.location.lng).toBe(
                  originalActivity.location.lng
                );
              });
            });
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
