/**
 * Property-Based Tests for Drag-Drop Reordering
 *
 * Feature: tripai-travel-planner, Property 16: Drag-Drop Reordering
 * Validates: Requirements 7.2
 *
 * Property: For any activity dragged to a new position within the same day,
 * the itinerary order should update immediately with the activity at the new position.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateDragOverUpdate } from "@/components/planner/itinerary/utils/drag-handlers";
import {
  itineraryArbitrary,
  activityArbitrary,
} from "@/test/utils/property-test-helpers";
import type { Itinerary, Activity } from "@/types/itinerary";
import type { Active, Over } from "@dnd-kit/core";

describe("Drag-Drop Reordering Property Tests", () => {
  /**
   * Helper to create mock Active and Over objects for dnd-kit
   */
  const createDragObjects = (
    activeId: string,
    overId: string,
    activeDayNumber: number,
    overDayNumber: number,
    isEmpty: boolean = false
  ): { active: Active; over: Over } => {
    const active: Active = {
      id: activeId,
      data: {
        current: {
          dayNumber: activeDayNumber,
        },
      },
      rect: {
        current: {
          initial: null,
          translated: {
            top: 100,
            left: 0,
            bottom: 150,
            right: 200,
            width: 200,
            height: 50,
          },
        },
      },
    } as Active;

    const over: Over = {
      id: overId,
      data: {
        current: {
          dayNumber: overDayNumber,
          isEmpty,
        },
      },
      rect: {
        top: 200,
        left: 0,
        bottom: 250,
        right: 200,
        width: 200,
        height: 50,
      },
    } as Over;

    return { active, over };
  };

  /**
   * Arbitrary for generating an itinerary with at least one day with multiple activities
   */
  const itineraryWithActivitiesArbitrary = fc
    .tuple(
      fc.uuid(), // itinerary id
      fc.uuid(), // user_id
      fc.string({ minLength: 1, maxLength: 100 }), // title
      fc.string({ minLength: 1, maxLength: 100 }), // destination
      fc.integer({ min: 1, max: 30 }), // day_number
      fc.array(activityArbitrary, { minLength: 2, maxLength: 10 }) // activities
    )
    .map(([id, user_id, title, destination, day_number, activities]) => {
      // Ensure activities have sequential order
      const orderedActivities = activities.map((activity, index) => ({
        ...activity,
        order: index,
      }));

      const date = "2025-06-15";
      const itinerary: Itinerary = {
        id,
        user_id,
        title,
        destination,
        start_date: date,
        end_date: date,
        days: [
          {
            day_number,
            date,
            activities: orderedActivities,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return itinerary;
    });

  it("Property 16: Drag-Drop Reordering - for any activity dragged to a new position within the same day, the itinerary order should update immediately", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }), // source index
        fc.integer({ min: 0, max: 9 }), // target index
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          // Skip if indices are out of bounds or the same
          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          // Create drag objects for same-day reordering
          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          // Perform the drag operation
          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          // Verify result is not null
          expect(result).not.toBeNull();

          if (result) {
            const newDay = result.newItinerary.days[0];
            const newActivities = newDay.activities;

            // Verify the activity was moved
            expect(newActivities.length).toBe(activities.length);

            // Find the moved activity in the new list
            const movedActivity = newActivities.find(
              (a) => a.id === sourceActivity.id
            );
            expect(movedActivity).toBeDefined();

            // Verify the activity is at or near the target position
            const newIndex = newActivities.findIndex(
              (a) => a.id === sourceActivity.id
            );
            expect(newIndex).not.toBe(sourceIdx);

            // Verify all activities have sequential order values
            newActivities.forEach((activity, index) => {
              expect(activity.order).toBe(index);
            });

            // Verify no activities were lost or duplicated
            const originalIds = new Set(activities.map((a) => a.id));
            const newIds = new Set(newActivities.map((a) => a.id));
            expect(newIds).toEqual(originalIds);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Order Preservation): All activities maintain sequential order after reordering", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          if (result) {
            const newActivities = result.newItinerary.days[0].activities;

            // Verify order values are sequential starting from 0
            for (let i = 0; i < newActivities.length; i++) {
              expect(newActivities[i].order).toBe(i);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Activity Conservation): No activities are lost or duplicated during reordering", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          if (result) {
            const originalIds = activities.map((a) => a.id).sort();
            const newIds = result.newItinerary.days[0].activities
              .map((a) => a.id)
              .sort();

            // Verify same set of activity IDs
            expect(newIds).toEqual(originalIds);

            // Verify count is the same
            expect(result.newItinerary.days[0].activities.length).toBe(
              activities.length
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Immutability): Original itinerary is not mutated during reordering", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          // Capture original state for comparison
          const originalActivityOrders = activities.map((a) => ({
            id: a.id,
            order: a.order,
          }));
          const originalActivityCount = activities.length;

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          // Verify original itinerary structure was not mutated
          // Check that activity count hasn't changed
          expect(itinerary.days[0].activities.length).toBe(
            originalActivityCount
          );

          // Check that order values haven't changed in original
          const currentActivityOrders = itinerary.days[0].activities.map(
            (a) => ({ id: a.id, order: a.order })
          );
          expect(currentActivityOrders).toEqual(originalActivityOrders);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Position Change): Dragged activity changes position in the list", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          if (result) {
            const newActivities = result.newItinerary.days[0].activities;
            const newIndex = newActivities.findIndex(
              (a) => a.id === sourceActivity.id
            );

            // Verify the activity moved from its original position
            expect(newIndex).not.toBe(sourceIdx);

            // Verify the activity exists in the new list
            expect(newIndex).toBeGreaterThanOrEqual(0);
            expect(newIndex).toBeLessThan(newActivities.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Same Day Constraint): Reordering only affects the same day", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          if (result) {
            // Verify crossDayInfo is null for same-day reordering
            expect(result.crossDayInfo).toBeNull();

            // Verify the day number hasn't changed
            expect(result.newItinerary.days[0].day_number).toBe(day.day_number);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Activity Data Integrity): Activity properties remain unchanged except order", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          if (result) {
            const newActivities = result.newItinerary.days[0].activities;
            const movedActivity = newActivities.find(
              (a) => a.id === sourceActivity.id
            );

            expect(movedActivity).toBeDefined();

            if (movedActivity) {
              // Verify all properties except order remain the same
              expect(movedActivity.id).toBe(sourceActivity.id);
              expect(movedActivity.time).toBe(sourceActivity.time);
              expect(movedActivity.title).toBe(sourceActivity.title);
              expect(movedActivity.note).toBe(
                sourceActivity.note
              );
              expect(movedActivity.location).toEqual(sourceActivity.location);
              expect(movedActivity.duration_minutes).toBe(
                sourceActivity.duration_minutes
              );
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Boundary Cases): Reordering works at list boundaries", async () => {
    await fc.assert(
      fc.asyncProperty(itineraryWithActivitiesArbitrary, async (itinerary) => {
        const day = itinerary.days[0];
        const activities = day.activities;

        fc.pre(activities.length >= 2);

        // Test moving first to last position
        const firstActivity = activities[0];
        const lastActivity = activities[activities.length - 1];

        const { active, over } = createDragObjects(
          firstActivity.id,
          lastActivity.id,
          day.day_number,
          day.day_number
        );

        const result = calculateDragOverUpdate(
          active,
          over,
          active.data.current,
          over.data.current,
          itinerary
        );

        if (result) {
          const newActivities = result.newItinerary.days[0].activities;

          // Verify the activity moved
          const newIndex = newActivities.findIndex(
            (a) => a.id === firstActivity.id
          );
          expect(newIndex).not.toBe(0);

          // Verify all activities have valid order
          newActivities.forEach((activity, index) => {
            expect(activity.order).toBe(index);
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Determinism): Same drag operation produces same result", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          // Perform the same drag operation twice
          const result1 = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          const result2 = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          // Results should be identical
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 16 (Non-Null Result): Valid drag operations always produce a result", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const day = itinerary.days[0];
          const activities = day.activities;

          fc.pre(sourceIdx < activities.length);
          fc.pre(targetIdx < activities.length);
          fc.pre(sourceIdx !== targetIdx);

          const sourceActivity = activities[sourceIdx];
          const targetActivity = activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            day.day_number,
            day.day_number
          );

          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          // Valid drag operations should always produce a result
          expect(result).not.toBeNull();
          expect(result).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
