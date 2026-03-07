/**
 * Property-Based Tests for Cross-Day Activity Movement
 *
 * Feature: tripai-travel-planner, Property 17: Cross-Day Activity Movement
 * Validates: Requirements 7.4
 *
 * Property: For any activity moved from one day to another, the activity should be
 * removed from the source day and added to the target day, updating day groupings correctly.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { calculateDragOverUpdate } from "@/components/planner/itinerary/utils/drag-handlers";
import { activityArbitrary } from "@/test/utils/property-test-helpers";
import type { Itinerary, Activity } from "@/types/itinerary";
import type { Active, Over } from "@dnd-kit/core";

describe("Cross-Day Activity Movement Property Tests", () => {
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
   * Arbitrary for generating an itinerary with at least two days with activities
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
    .map(
      ([id, user_id, title, destination, day1Activities, day2Activities]) => {
        // Ensure activities have sequential order
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
        };

        return itinerary;
      }
    );

  it("Property 17: Cross-Day Activity Movement - activity is removed from source day and added to target day", async () => {
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

          // Verify result is not null
          expect(result).not.toBeNull();

          if (result) {
            const newSourceDay = result.newItinerary.days[0];
            const newTargetDay = result.newItinerary.days[1];

            // Verify activity was removed from source day
            expect(newSourceDay.activities.length).toBe(
              originalSourceCount - 1
            );
            expect(
              newSourceDay.activities.find(
                (a: Activity) => a.id === sourceActivity.id
              )
            ).toBeUndefined();

            // Verify activity was added to target day
            expect(newTargetDay.activities.length).toBe(
              originalTargetCount + 1
            );
            const movedActivity = newTargetDay.activities.find(
              (a: Activity) => a.id === sourceActivity.id
            );
            expect(movedActivity).toBeDefined();

            // Verify crossDayInfo is set correctly
            expect(result.crossDayInfo).not.toBeNull();
            expect(result.crossDayInfo?.sourceDayNumber).toBe(
              sourceDay.day_number
            );
            expect(result.crossDayInfo?.targetDayNumber).toBe(
              targetDay.day_number
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 17 (Activity Conservation): Total activity count remains the same after cross-day movement", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

          const originalTotalCount =
            sourceDay.activities.length + targetDay.activities.length;

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
            itinerary
          );

          if (result) {
            const newTotalCount =
              result.newItinerary.days[0].activities.length +
              result.newItinerary.days[1].activities.length;

            // Total activity count should remain the same
            expect(newTotalCount).toBe(originalTotalCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 17 (Order Preservation): Activities in both days maintain sequential order after movement", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

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
            itinerary
          );

          if (result) {
            const newSourceDay = result.newItinerary.days[0];
            const newTargetDay = result.newItinerary.days[1];

            // Verify source day activities have sequential order
            newSourceDay.activities.forEach(
              (activity: Activity, index: number) => {
                expect(activity.order).toBe(index);
              }
            );

            // Verify target day activities have sequential order
            newTargetDay.activities.forEach(
              (activity: Activity, index: number) => {
                expect(activity.order).toBe(index);
              }
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 17 (Activity Data Integrity): Moved activity retains all properties except order", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

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
            itinerary
          );

          if (result) {
            const movedActivity = result.newItinerary.days[1].activities.find(
              (a: Activity) => a.id === sourceActivity.id
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

  it("Property 17 (Immutability): Original itinerary is not mutated during cross-day movement", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

          // Capture original state
          const originalSourceCount = sourceDay.activities.length;
          const originalTargetCount = targetDay.activities.length;
          const originalSourceIds = sourceDay.activities.map(
            (a: Activity) => a.id
          );
          const originalTargetIds = targetDay.activities.map(
            (a: Activity) => a.id
          );

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            sourceDay.day_number,
            targetDay.day_number
          );

          calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            itinerary
          );

          // Verify original itinerary was not mutated
          expect(itinerary.days[0].activities.length).toBe(originalSourceCount);
          expect(itinerary.days[1].activities.length).toBe(originalTargetCount);
          expect(
            itinerary.days[0].activities.map((a: Activity) => a.id)
          ).toEqual(originalSourceIds);
          expect(
            itinerary.days[1].activities.map((a: Activity) => a.id)
          ).toEqual(originalTargetIds);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 17 (Cross-Day Info): crossDayInfo correctly identifies source and target days", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

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
            itinerary
          );

          if (result) {
            // Verify crossDayInfo is not null for cross-day movement
            expect(result.crossDayInfo).not.toBeNull();
            expect(result.crossDayInfo?.sourceDayNumber).toBe(
              sourceDay.day_number
            );
            expect(result.crossDayInfo?.targetDayNumber).toBe(
              targetDay.day_number
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 17 (Empty Day Drop): Activity can be moved to an empty day", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx) => {
          const sourceDay = itinerary.days[0];

          fc.pre(sourceIdx < sourceDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];

          // Make target day empty
          const modifiedItinerary = {
            ...itinerary,
            days: [
              itinerary.days[0],
              {
                ...itinerary.days[1],
                activities: [],
              },
            ],
          };

          const targetDay = modifiedItinerary.days[1];

          // Create drag objects for dropping on empty day
          const { active, over } = createDragObjects(
            sourceActivity.id,
            `day-${targetDay.day_number}`,
            sourceDay.day_number,
            targetDay.day_number,
            true // isEmpty flag
          );

          const result = calculateDragOverUpdate(
            active,
            over,
            active.data.current,
            over.data.current,
            modifiedItinerary
          );

          if (result) {
            const newSourceDay = result.newItinerary.days[0];
            const newTargetDay = result.newItinerary.days[1];

            // Verify activity was removed from source
            expect(
              newSourceDay.activities.find(
                (a: Activity) => a.id === sourceActivity.id
              )
            ).toBeUndefined();

            // Verify activity was added to target (now has 1 activity)
            expect(newTargetDay.activities.length).toBe(1);
            expect(newTargetDay.activities[0].id).toBe(sourceActivity.id);
            expect(newTargetDay.activities[0].order).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 17 (Determinism): Same cross-day drag operation produces same result", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

          const { active, over } = createDragObjects(
            sourceActivity.id,
            targetActivity.id,
            sourceDay.day_number,
            targetDay.day_number
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

  it("Property 17 (No Duplication): Activity appears exactly once after cross-day movement", async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryWithMultipleDaysArbitrary,
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

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
            itinerary
          );

          if (result) {
            // Count occurrences of the moved activity across all days
            let occurrenceCount = 0;
            result.newItinerary.days.forEach((day) => {
              day.activities.forEach((activity: Activity) => {
                if (activity.id === sourceActivity.id) {
                  occurrenceCount++;
                }
              });
            });

            // Activity should appear exactly once
            expect(occurrenceCount).toBe(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Property 17 (Other Days Unaffected): Days other than source and target remain unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .tuple(
            fc.uuid(),
            fc.uuid(),
            fc.string({ minLength: 1, maxLength: 100 }),
            fc.string({ minLength: 1, maxLength: 100 }),
            fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }),
            fc.array(activityArbitrary, { minLength: 1, maxLength: 5 }),
            fc.array(activityArbitrary, { minLength: 1, maxLength: 5 })
          )
          .map(
            ([
              id,
              user_id,
              title,
              destination,
              day1Activities,
              day2Activities,
              day3Activities,
            ]) => {
              const itinerary: Itinerary = {
                id,
                user_id,
                title,
                destination,
                start_date: "2025-06-15",
                end_date: "2025-06-17",
                days: [
                  {
                    day_number: 1,
                    date: "2025-06-15",
                    activities: day1Activities.map((a, i) => ({
                      ...a,
                      order: i,
                    })),
                  },
                  {
                    day_number: 2,
                    date: "2025-06-16",
                    activities: day2Activities.map((a, i) => ({
                      ...a,
                      order: i,
                    })),
                  },
                  {
                    day_number: 3,
                    date: "2025-06-17",
                    activities: day3Activities.map((a, i) => ({
                      ...a,
                      order: i,
                    })),
                  },
                ],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              return itinerary;
            }
          ),
        fc.integer({ min: 0, max: 4 }),
        fc.integer({ min: 0, max: 4 }),
        async (itinerary, sourceIdx, targetIdx) => {
          const sourceDay = itinerary.days[0];
          const targetDay = itinerary.days[1];
          const unaffectedDay = itinerary.days[2];

          fc.pre(sourceIdx < sourceDay.activities.length);
          fc.pre(targetIdx < targetDay.activities.length);

          const sourceActivity = sourceDay.activities[sourceIdx];
          const targetActivity = targetDay.activities[targetIdx];

          // Capture original state of unaffected day
          const originalUnaffectedActivities = unaffectedDay.activities.map(
            (a: Activity) => ({ ...a })
          );

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
            itinerary
          );

          if (result) {
            const newUnaffectedDay = result.newItinerary.days[2];

            // Verify unaffected day remains unchanged
            expect(newUnaffectedDay.activities.length).toBe(
              originalUnaffectedActivities.length
            );
            expect(
              newUnaffectedDay.activities.map((a: Activity) => a.id)
            ).toEqual(originalUnaffectedActivities.map((a) => a.id));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
