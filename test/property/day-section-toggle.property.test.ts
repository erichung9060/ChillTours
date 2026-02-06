/**
 * Property-Based Tests for Day Section Expand/Collapse
 *
 * Feature: tripai-travel-planner, Property 11: Day Section Expand/Collapse
 * Validates: Requirements 5.2
 *
 * Property: For any day section in the itinerary, clicking the header should
 * toggle between expanded and collapsed states.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

describe("Day Section Expand/Collapse Property Tests", () => {
  // Arbitrary for day numbers (1-30 as per schema)
  const dayNumberArbitrary = fc.integer({ min: 1, max: 30 });

  // Arbitrary for a set of expanded day numbers
  const expandedDaysSetArbitrary = fc
    .array(dayNumberArbitrary, { maxLength: 30 })
    .map((days) => new Set(days));

  /**
   * Simulates the toggleDay function from ItineraryPanel
   */
  const toggleDay = (
    expandedDays: Set<number>,
    dayNumber: number
  ): Set<number> => {
    const next = new Set(expandedDays);
    if (next.has(dayNumber)) {
      next.delete(dayNumber);
    } else {
      next.add(dayNumber);
    }
    return next;
  };

  it("Property 11: Day Section Expand/Collapse - for any day section, clicking header should toggle between expanded and collapsed states", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        dayNumberArbitrary,
        async (initialExpandedDays, dayNumber) => {
          const wasExpanded = initialExpandedDays.has(dayNumber);

          // Toggle the day
          const newExpandedDays = toggleDay(initialExpandedDays, dayNumber);

          // Verify the state switched to opposite
          const isNowExpanded = newExpandedDays.has(dayNumber);
          expect(isNowExpanded).toBe(!wasExpanded);

          // Verify other days remain unchanged
          for (const otherDay of initialExpandedDays) {
            if (otherDay !== dayNumber) {
              expect(newExpandedDays.has(otherDay)).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (Idempotence): Toggling twice returns to original state", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        dayNumberArbitrary,
        async (initialExpandedDays, dayNumber) => {
          // Toggle twice
          const toggledOnce = toggleDay(initialExpandedDays, dayNumber);
          const toggledTwice = toggleDay(toggledOnce, dayNumber);

          // Should return to original state
          expect(toggledTwice).toEqual(initialExpandedDays);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (Multiple Toggles): Multiple consecutive toggles maintain consistency", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        dayNumberArbitrary,
        fc.integer({ min: 1, max: 20 }),
        async (initialExpandedDays, dayNumber, toggleCount) => {
          let currentExpandedDays = initialExpandedDays;
          const wasInitiallyExpanded = initialExpandedDays.has(dayNumber);

          // Perform multiple toggles
          for (let i = 0; i < toggleCount; i++) {
            currentExpandedDays = toggleDay(currentExpandedDays, dayNumber);
          }

          // Verify final state based on toggle count
          // Even number of toggles = back to initial state
          // Odd number of toggles = opposite of initial state
          const expectedExpanded =
            toggleCount % 2 === 0
              ? wasInitiallyExpanded
              : !wasInitiallyExpanded;
          expect(currentExpandedDays.has(dayNumber)).toBe(expectedExpanded);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (Independence): Toggling one day does not affect other days", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        dayNumberArbitrary,
        dayNumberArbitrary,
        async (initialExpandedDays, dayToToggle, otherDay) => {
          // Skip if both days are the same
          fc.pre(dayToToggle !== otherDay);

          const otherDayWasExpanded = initialExpandedDays.has(otherDay);

          // Toggle one day
          const newExpandedDays = toggleDay(initialExpandedDays, dayToToggle);

          // Verify the other day's state is unchanged
          expect(newExpandedDays.has(otherDay)).toBe(otherDayWasExpanded);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (State Transitions): All state transitions are valid", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        fc.array(dayNumberArbitrary, { minLength: 1, maxLength: 10 }),
        async (initialExpandedDays, daysToToggle) => {
          let currentExpandedDays = initialExpandedDays;

          // Perform a sequence of toggles
          for (const dayNumber of daysToToggle) {
            const beforeToggle = currentExpandedDays.has(dayNumber);
            currentExpandedDays = toggleDay(currentExpandedDays, dayNumber);
            const afterToggle = currentExpandedDays.has(dayNumber);

            // Verify each transition is valid (opposite state)
            expect(afterToggle).toBe(!beforeToggle);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (Determinism): Same initial state and toggle sequence always produces same result", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        fc.array(dayNumberArbitrary, { minLength: 0, maxLength: 10 }),
        async (initialExpandedDays, toggleSequence) => {
          // First execution
          let result1 = initialExpandedDays;
          for (const dayNumber of toggleSequence) {
            result1 = toggleDay(result1, dayNumber);
          }

          // Second execution with same inputs
          let result2 = initialExpandedDays;
          for (const dayNumber of toggleSequence) {
            result2 = toggleDay(result2, dayNumber);
          }

          // Results should be identical
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (Boundary): Toggle works correctly at state boundaries", async () => {
    // Test explicit boundary cases
    const testCases = [
      {
        name: "Empty set - expand day 1",
        initial: new Set<number>(),
        dayNumber: 1,
        expectedExpanded: true,
      },
      {
        name: "Single day expanded - collapse it",
        initial: new Set([1]),
        dayNumber: 1,
        expectedExpanded: false,
      },
      {
        name: "Multiple days expanded - collapse one",
        initial: new Set([1, 2, 3]),
        dayNumber: 2,
        expectedExpanded: false,
      },
      {
        name: "Multiple days expanded - expand new day",
        initial: new Set([1, 3]),
        dayNumber: 2,
        expectedExpanded: true,
      },
    ];

    for (const { name, initial, dayNumber, expectedExpanded } of testCases) {
      const result = toggleDay(initial, dayNumber);
      expect(result.has(dayNumber)).toBe(expectedExpanded);
    }
  });

  it("Property 11 (Set Size): Toggle increases or decreases set size by exactly 1", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        dayNumberArbitrary,
        async (initialExpandedDays, dayNumber) => {
          const initialSize = initialExpandedDays.size;
          const wasExpanded = initialExpandedDays.has(dayNumber);

          const newExpandedDays = toggleDay(initialExpandedDays, dayNumber);
          const newSize = newExpandedDays.size;

          // If was expanded, size should decrease by 1
          // If was collapsed, size should increase by 1
          if (wasExpanded) {
            expect(newSize).toBe(initialSize - 1);
          } else {
            expect(newSize).toBe(initialSize + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (Commutativity): Order of toggle operations for different days doesn't matter", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        dayNumberArbitrary,
        dayNumberArbitrary,
        async (initialExpandedDays, day1, day2) => {
          // Skip if both days are the same
          fc.pre(day1 !== day2);

          // Toggle in order: day1, then day2
          const result1 = toggleDay(toggleDay(initialExpandedDays, day1), day2);

          // Toggle in reverse order: day2, then day1
          const result2 = toggleDay(toggleDay(initialExpandedDays, day2), day1);

          // Results should be identical (commutative)
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 11 (Preservation): Toggle preserves all other days in the set", async () => {
    await fc.assert(
      fc.asyncProperty(
        expandedDaysSetArbitrary,
        dayNumberArbitrary,
        async (initialExpandedDays, dayToToggle) => {
          const newExpandedDays = toggleDay(initialExpandedDays, dayToToggle);

          // Count how many days changed
          let changedCount = 0;

          // Check all possible days (1-30)
          for (let day = 1; day <= 30; day++) {
            const wasExpanded = initialExpandedDays.has(day);
            const isExpanded = newExpandedDays.has(day);

            if (wasExpanded !== isExpanded) {
              changedCount++;
              // The only day that should change is the toggled day
              expect(day).toBe(dayToToggle);
            }
          }

          // Exactly one day should have changed
          expect(changedCount).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
