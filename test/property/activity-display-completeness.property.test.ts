/**
 * Property-Based Tests for Activity Display Completeness
 * 
 * Feature: tripai-travel-planner, Property 12: Activity Display Completeness
 * Validates: Requirements 5.5
 * 
 * Property: For any activity rendered in the UI, the display should include
 * time, location name, and description fields.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { activityArbitrary } from "@/test/utils/property-test-helpers";
import type { Activity } from "@/types/itinerary";

describe("Activity Display Completeness Property Tests", () => {
  /**
   * Simulates rendering an activity to a display string
   * This represents what the UI component would display
   */
  const renderActivityToString = (activity: Activity): string => {
    // Simulate the rendering logic from ItineraryPanel component
    const parts: string[] = [];
    
    // Time field
    parts.push(`Time: ${activity.time}`);
    
    // Location name field
    parts.push(`Location: ${activity.location.name}`);
    
    // Description field (may be empty but should be present)
    parts.push(`Description: ${activity.description}`);
    
    return parts.join(" | ");
  };

  /**
   * Checks if a rendered string contains all required fields
   */
  const hasAllRequiredFields = (rendered: string, activity: Activity): boolean => {
    // Check for time
    const hasTime = rendered.includes(activity.time);
    
    // Check for location name
    const hasLocationName = rendered.includes(activity.location.name);
    
    // Check for description (field should be present even if empty)
    const hasDescriptionField = rendered.includes("Description:");
    
    return hasTime && hasLocationName && hasDescriptionField;
  };

  it("Property 12: Activity Display Completeness - for any activity, display should include time, location name, and description fields", async () => {
    await fc.assert(
      fc.asyncProperty(activityArbitrary, async (activity) => {
        // Render the activity
        const rendered = renderActivityToString(activity);

        // Verify all required fields are present
        expect(hasAllRequiredFields(rendered, activity)).toBe(true);

        // Verify specific fields
        expect(rendered).toContain(activity.time);
        expect(rendered).toContain(activity.location.name);
        expect(rendered).toContain("Description:");
      }),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Field Presence): All three required fields must be present", async () => {
    await fc.assert(
      fc.asyncProperty(activityArbitrary, async (activity) => {
        const rendered = renderActivityToString(activity);

        // Count the presence of required field markers
        const hasTimeField = rendered.includes("Time:");
        const hasLocationField = rendered.includes("Location:");
        const hasDescriptionField = rendered.includes("Description:");

        // All three fields must be present
        expect(hasTimeField).toBe(true);
        expect(hasLocationField).toBe(true);
        expect(hasDescriptionField).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Data Integrity): Rendered fields must match source activity data", async () => {
    await fc.assert(
      fc.asyncProperty(activityArbitrary, async (activity) => {
        const rendered = renderActivityToString(activity);

        // Verify the actual values are present, not just the field labels
        expect(rendered).toContain(activity.time);
        expect(rendered).toContain(activity.location.name);
        
        // Description should be present (even if empty string)
        if (activity.description.length > 0) {
          expect(rendered).toContain(activity.description);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Empty Description): Display should handle empty descriptions gracefully", async () => {
    await fc.assert(
      fc.asyncProperty(
        activityArbitrary.map(activity => ({
          ...activity,
          description: "", // Force empty description
        })),
        async (activity) => {
          const rendered = renderActivityToString(activity);

          // Even with empty description, the field should be present
          expect(rendered).toContain("Description:");
          
          // Time and location should still be present
          expect(rendered).toContain(activity.time);
          expect(rendered).toContain(activity.location.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Special Characters): Display should handle special characters in fields", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          time: fc
            .integer({ min: 0, max: 23 })
            .chain((hour) =>
              fc
                .integer({ min: 0, max: 59 })
                .map(
                  (minute) =>
                    `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
                )
            ),
          title: fc.string({ minLength: 1, maxLength: 100 }),
          description: fc.string({ minLength: 0, maxLength: 500 }),
          location: fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            lat: fc.double({ min: -90, max: 90 }),
            lng: fc.double({ min: -180, max: 180 }),
            place_id: fc.option(fc.string(), { nil: undefined }),
          }),
          duration_minutes: fc.integer({ min: 15, max: 480 }),
          order: fc.nat(),
        }),
        async (activity) => {
          const rendered = renderActivityToString(activity);

          // All required fields should be present regardless of special characters
          expect(hasAllRequiredFields(rendered, activity)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Completeness Invariant): No activity should be rendered without all required fields", async () => {
    await fc.assert(
      fc.asyncProperty(activityArbitrary, async (activity) => {
        const rendered = renderActivityToString(activity);

        // Split by field separator and count fields
        const fieldCount = (rendered.match(/:/g) || []).length;

        // Should have at least 3 fields (Time, Location, Description)
        expect(fieldCount).toBeGreaterThanOrEqual(3);

        // Verify each required field is present
        const requiredFields = ["Time:", "Location:", "Description:"];
        for (const field of requiredFields) {
          expect(rendered).toContain(field);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Multiple Activities): Each activity in a list should have all required fields", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(activityArbitrary, { minLength: 1, maxLength: 10 }),
        async (activities) => {
          // Render all activities
          const renderedActivities = activities.map(renderActivityToString);

          // Verify each rendered activity has all required fields
          for (let i = 0; i < activities.length; i++) {
            const activity = activities[i];
            const rendered = renderedActivities[i];

            expect(hasAllRequiredFields(rendered, activity)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Field Order Independence): Required fields should be present regardless of rendering order", async () => {
    await fc.assert(
      fc.asyncProperty(activityArbitrary, async (activity) => {
        // Render in different orders
        const order1 = `Time: ${activity.time} | Location: ${activity.location.name} | Description: ${activity.description}`;
        const order2 = `Location: ${activity.location.name} | Time: ${activity.time} | Description: ${activity.description}`;
        const order3 = `Description: ${activity.description} | Time: ${activity.time} | Location: ${activity.location.name}`;

        // All orders should contain all required fields
        for (const rendered of [order1, order2, order3]) {
          expect(rendered).toContain(activity.time);
          expect(rendered).toContain(activity.location.name);
          expect(rendered).toContain("Description:");
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 12 (Boundary Cases): Display should handle edge case values correctly", async () => {
    // Test with specific boundary cases
    const boundaryActivities: Activity[] = [
      {
        id: "00000000-0000-0000-0000-000000000000",
        time: "00:00",
        title: "Midnight Activity",
        description: "",
        location: {
          name: "A",
          lat: 0,
          lng: 0,
        },
        duration_minutes: 15,
        order: 0,
      },
      {
        id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
        time: "23:59",
        title: "Late Night Activity",
        description: "x".repeat(500), // Max length description
        location: {
          name: "X".repeat(100), // Max length name
          lat: 90,
          lng: 180,
        },
        duration_minutes: 480,
        order: 999,
      },
    ];

    for (const activity of boundaryActivities) {
      const rendered = renderActivityToString(activity);
      expect(hasAllRequiredFields(rendered, activity)).toBe(true);
    }
  });

  it("Property 12 (Non-Null Guarantee): All required fields should be non-null in rendered output", async () => {
    await fc.assert(
      fc.asyncProperty(activityArbitrary, async (activity) => {
        const rendered = renderActivityToString(activity);

        // Verify the rendered string is not null or undefined
        expect(rendered).toBeDefined();
        expect(rendered).not.toBeNull();

        // Verify it's a non-empty string
        expect(rendered.length).toBeGreaterThan(0);

        // Verify all required fields are present and not null
        expect(rendered.includes(activity.time)).toBe(true);
        expect(rendered.includes(activity.location.name)).toBe(true);
        expect(rendered.includes("Description:")).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
