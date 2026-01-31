/**
 * Property-Based Tests for Reordering Persistence
 * 
 * Feature: tripai-travel-planner, Property 18: Reordering Persistence
 * Validates: Requirements 7.5
 * 
 * Property: For any reordering operation, the changes should be maintained in
 * session memory and reflected in subsequent renders.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateDragOverUpdate } from "@/components/planner/itinerary/utils/drag-handlers";
import { activityArbitrary } from "@/test/utils/property-test-helpers";
import type { Itinerary, Activity } from "@/types/itinerary";
import type { Active, Over } from "@dnd-kit/core";

describe("Reordering Persistence Property Tests", () => {
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
      disabled: false,
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
        shared_with: [],
      };

      return itinerary;
    });

  /**
   * Arbitrary for generating an itinerary with multiple days
   */
  const itineraryWithMultipleDaysArbitrary = fc
    .tuple(
      fc.uuid(), // itinerary id
      fc.uuid(), // user_id
      fc.string({ minLength: 1, maxLength: 100 }), // title
      fc.string({ minLength: 1, maxLength: 100 }), // destination
      fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }), // day 1 activities
      fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }) // day 2 activities
    )
    .map(([id, user_id, title, destination, day1Activities, day2Activities]) => {
      const orderedDay1Activities = day1Activities.map((activity, index) => ({
        ...activity,
        order: index,
      }));

      const orderedDay2Activities = day2Activities.map((activity, index) => ({
        ...activity,
        order: index,
      }));

      const startDate = "2025-06-15";
      const endDate = "2025-06-16";

      const itinerary: Itinerary = {
        id,
        user_id,
        title,
        destination,
        start_date: startDate,
        end_date: endDate,
        days: [
          {
            day_number: 1,
            date: startDate,
            activities: orderedDay1Activities,
          },
          {
            day_number: 2,
            date: endDate,
            activities: orderedDay2Activities,
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        shared_with: [],
      };

      return itinerary;
    });

  it("Property 18: Reordering Persistence - changes are maintained in the returned itinerary state", async () => {
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
            const newItinerary = result.newItinerary;

            // Simulate "subsequent render" by using the new itinerary as input
            // The new itinerary should maintain the reordered state
            const newDay = newItinerary.days[0];
            const newActivities = newDay.activities;

            // Verify the reordered state is maintained
            expect(newActivities.length).toBe(activities.length);

            // Verify all activities have sequential order values (persistence of order)
            newActivities.forEach((activity, index) => {
              expect(activity.order).toBe(index);
            });

            // Verify the moved activity is at its new position
            const movedActivityIndex = newActivities.findIndex(a => a.id === sourceActivity.id);
            expect(movedActivityIndex).not.toBe(sourceIdx);

            // Verify no activities were lost or duplicated
            const originalIds = new Set(activities.map(a => a.id));
            const newIds = new Set(newActivities.map(a => a.id));
            expect(newIds).toEqual(originalIds);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 18 (State Consistency): Multiple sequential reorderings maintain consistent state", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithActivitiesArbitrary,
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 9 }),
            fc.integer({ min: 0, max: 9 })
          ),
          { minLength: 2, maxLength: 5 }
        ),
        async (initialItinerary, reorderOperations) => {
          let currentItinerary = initialItinerary;

          // Perform multiple reordering operations sequentially
          for (const [sourceIdx, targetIdx] of reorderOperations) {
            const day = currentItinerary.days[0];
            const activities = day.activities;

            // Skip invalid operations
            if (sourceIdx >= activities.length || targetIdx >= activities.length || sourceIdx === targetIdx) {
              continue;
            }

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
              currentItinerary
            );

            if (result) {
              // Update current itinerary with the result (simulating persistence)
              currentItinerary = result.newItinerary;
            }
          }

          // Verify final state is consistent
          const finalDay = currentItinerary.days[0];
          const finalActivities = finalDay.activities;

          // All activities should have sequential order
          finalActivities.forEach((activity, index) => {
            expect(activity.order).toBe(index);
          });

          // No activities should be lost or duplicated
          const originalIds = new Set(initialItinerary.days[0].activities.map(a => a.id));
          const finalIds = new Set(finalActivities.map(a => a.id));
          expect(finalIds).toEqual(originalIds);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Property 18 (Cross-Day Persistence): Cross-day movements maintain state in both days", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }), // source activity index
        fc.integer({ min: 0, max: 4 }), // target activity index
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          // Skip if indices are out of bounds
          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

          const originalSourceCount = sourceDay.activities.length;
          const originalTargetCount = targetDay.activities.length;

          // Create drag objects for cross-day movement
          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            sourceDay.day_number,
            targetDay.day_number
          );

          // Perform the drag operation
          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          expect(result).not.toBeNull();

          if (result) {
            const newItinerary = result.newItinerary;

            // Simulate "subsequent render" - the state should be maintained
            const newSourceDay = newItinerary.days[0];
            const newTargetDay = newItinerary.days[1];

            // Verify source day state is maintained
            expect(newSourceDay.activities.length).toBe(originalSourceCount - 1);
            expect(newSourceDay.activities.find((a: Activity) => a.id === sourceActivity.id)).toBeUndefined();

            // Verify source day activities have sequential order
            newSourceDay.activities.forEach((activity: Activity, index: number) => {
              expect(activity.order).toBe(index);
            });

            // Verify target day state is maintained
            expect(newTargetDay.activities.length).toBe(originalTargetCount + 1);
            const movedActivity = newTargetDay.activities.find((a: Activity) => a.id === sourceActivity.id);
            expect(movedActivity).toBeDefined();

            // Verify target day activities have sequential order
            newTargetDay.activities.forEach((activity: Activity, index: number) => {
              expect(activity.order).toBe(index);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 18 (Idempotent State): Reordering produces a stable state that doesn't change on re-render", async () => {
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

          // Perform the drag operation
          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          if (result) {
            const firstItinerary = result.newItinerary;

            // Simulate a "re-render" by creating a deep copy
            // This tests that the state is stable and doesn't have hidden mutations
            const deepCopy = JSON.parse(JSON.stringify(firstItinerary)) as Itinerary;

            // Verify the essential state properties are preserved
            // (Note: JSON serialization removes undefined values and converts -0 to 0)
            expect(deepCopy.id).toBe(firstItinerary.id);
            expect(deepCopy.days.length).toBe(firstItinerary.days.length);
            expect(deepCopy.days[0].activities.length).toBe(firstItinerary.days[0].activities.length);

            // Verify order values are still sequential
            deepCopy.days[0].activities.forEach((activity, index) => {
              expect(activity.order).toBe(index);
              expect(activity.id).toBe(firstItinerary.days[0].activities[index].id);
            });

            // Verify activity IDs are in the same order
            const originalIds = firstItinerary.days[0].activities.map(a => a.id);
            const copiedIds = deepCopy.days[0].activities.map(a => a.id);
            expect(copiedIds).toEqual(originalIds);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 18 (State Snapshot): Reordered state can be captured and restored", async () => {
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
            // Take a snapshot of the reordered state
            const snapshot = {
              activityIds: result.newItinerary.days[0].activities.map(a => a.id),
              activityOrders: result.newItinerary.days[0].activities.map(a => a.order),
            };

            // Simulate restoring from snapshot
            const restoredActivities = result.newItinerary.days[0].activities;

            // Verify snapshot matches the actual state
            expect(restoredActivities.map(a => a.id)).toEqual(snapshot.activityIds);
            expect(restoredActivities.map(a => a.order)).toEqual(snapshot.activityOrders);

            // Verify orders are sequential
            snapshot.activityOrders.forEach((order, index) => {
              expect(order).toBe(index);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 18 (Persistence Across Operations): State persists correctly through mixed same-day and cross-day operations", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.array(
          fc.record({
            type: fc.constantFrom('same-day', 'cross-day'),
            sourceIdx: fc.integer({ min: 0, max: 4 }),
            targetIdx: fc.integer({ min: 0, max: 4 }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (initialItinerary, operations) => {
          let currentItinerary = initialItinerary;

          for (const operation of operations) {
            if (operation.type === 'same-day') {
              // Same-day reordering on day 1
              const day = currentItinerary.days[0];
              const activities = day.activities;

              if (operation.sourceIdx >= activities.length || 
                  operation.targetIdx >= activities.length || 
                  operation.sourceIdx === operation.targetIdx) {
                continue;
              }

              const sourceActivity = activities[operation.sourceIdx];
              const targetActivity = activities[operation.targetIdx];

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
                currentItinerary
              );

              if (result) {
                currentItinerary = result.newItinerary;
              }
            } else {
              // Cross-day movement
              const sourceDay = currentItinerary.days[0];
              const targetDay = currentItinerary.days[1];

              if (operation.sourceIdx >= sourceDay.activities.length || 
                  operation.targetIdx >= targetDay.activities.length) {
                continue;
              }

              const sourceActivity = sourceDay.activities[operation.sourceIdx];
              const targetActivity = targetDay.activities[operation.targetIdx];

              const { active, over } = createDragObjects(
                sourceActivity.id,
                targetActivity.id,
                sourceDay.day_number,
                targetDay.day_number
              );

              const result = calculateDragOverUpdate(
                active,
                over,
                active.data.current,
                over.data.current,
                currentItinerary
              );

              if (result) {
                currentItinerary = result.newItinerary;
              }
            }
          }

          // Verify final state consistency
          currentItinerary.days.forEach(day => {
            // All activities should have sequential order
            day.activities.forEach((activity, index) => {
              expect(activity.order).toBe(index);
            });
          });

          // Verify total activity count is preserved
          const initialTotalCount = initialItinerary.days.reduce(
            (sum, day) => sum + day.activities.length,
            0
          );
          const finalTotalCount = currentItinerary.days.reduce(
            (sum, day) => sum + day.activities.length,
            0
          );
          expect(finalTotalCount).toBe(initialTotalCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  it("Property 18 (State Integrity): Reordered state maintains all activity properties", async () => {
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

          // Capture all properties of all activities before reordering
          const activityPropertiesMap = new Map(
            activities.map(a => [
              a.id,
              {
                time: a.time,
                title: a.title,
                description: a.description,
                location: a.location,
                duration_minutes: a.duration_minutes,
              },
            ])
          );

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

            // Verify all activities maintain their properties (except order)
            newActivities.forEach(activity => {
              const originalProps = activityPropertiesMap.get(activity.id);
              expect(originalProps).toBeDefined();

              if (originalProps) {
                expect(activity.time).toBe(originalProps.time);
                expect(activity.title).toBe(originalProps.title);
                expect(activity.description).toBe(originalProps.description);
                expect(activity.location).toEqual(originalProps.location);
                expect(activity.duration_minutes).toBe(originalProps.duration_minutes);
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 18 (Deterministic Persistence): Same reordering operation always produces same persistent state", async () => {
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

          // Perform the same operation multiple times
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

          // Both results should be identical (deterministic)
          expect(result1).toEqual(result2);

          if (result1 && result2) {
            // Verify the persistent state is identical
            const activities1 = result1.newItinerary.days[0].activities;
            const activities2 = result2.newItinerary.days[0].activities;

            expect(activities1.map(a => a.id)).toEqual(activities2.map(a => a.id));
            expect(activities1.map(a => a.order)).toEqual(activities2.map(a => a.order));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
