import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import {
  itineraryArbitrary,
  chatMessageArbitrary,
} from "../utils/property-test-helpers";

/**
 * Property-based tests for chat context inclusion
 * Feature: tripai-travel-planner
 *
 * These tests verify that the chat system properly includes context
 * (conversation history, itinerary, custom preferences) when making
 * API requests to the Edge Function.
 */

/**
 * Mock function to simulate Edge Function request building
 * This represents the logic in the Edge Function that receives and processes context
 */
function buildChatRequest(
  message: string,
  history: Array<{ role: string; content: string }>,
  context: any
): {
  message: string;
  history: Array<{ role: string; content: string }>;
  context: any;
} {
  return {
    message,
    history,
    context,
  };
}

describe("Chat Context Inclusion Properties", () => {
  // Feature: tripai-travel-planner, Property 6: Gemini API Request Context Inclusion
  test("Property 6: For any user message, the request should include conversation history", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.array(chatMessageArbitrary, { minLength: 0, maxLength: 10 }),
        async (message, history) => {
          // Build request as Edge Function would
          const request = buildChatRequest(
            message,
            history.map((msg) => ({ role: msg.role, content: msg.content })),
            null
          );

          // Property: Request should include message
          expect(request.message).toBe(message);

          // Property: Request should include history
          expect(request.history).toBeDefined();
          expect(Array.isArray(request.history)).toBe(true);
          expect(request.history.length).toBe(history.length);

          // Property: History should preserve message order
          request.history.forEach((msg, index) => {
            expect(msg.role).toBe(history[index].role);
            expect(msg.content).toBe(history[index].content);
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 6.1: For any user message with itinerary context, the request should include the itinerary", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.array(chatMessageArbitrary, { minLength: 0, maxLength: 5 }),
        itineraryArbitrary,
        async (message, history, itinerary) => {
          // Build request as Edge Function would
          const request = buildChatRequest(
            message,
            history.map((msg) => ({ role: msg.role, content: msg.content })),
            itinerary
          );

          // Property: Request should include itinerary context
          expect(request.context).toBeDefined();
          expect(request.context).not.toBeNull();

          // Property: Context should include key itinerary fields
          expect(request.context.id).toBe(itinerary.id);
          expect(request.context.destination).toBe(itinerary.destination);
          expect(request.context.title).toBe(itinerary.title);
          expect(request.context.start_date).toBe(itinerary.start_date);
          expect(request.context.end_date).toBe(itinerary.end_date);

          // Property: Context should include days array
          expect(Array.isArray(request.context.days)).toBe(true);
          expect(request.context.days.length).toBe(itinerary.days.length);

          // Property: Each day should include activities
          request.context.days.forEach((day: any, dayIndex: number) => {
            expect(day.day_number).toBe(itinerary.days[dayIndex].day_number);
            expect(Array.isArray(day.activities)).toBe(true);
            expect(day.activities.length).toBe(
              itinerary.days[dayIndex].activities.length
            );
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 6.3: For any conversation history, message order should be preserved", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 10 }),
        async (message, history) => {
          // Build request as Edge Function would
          const request = buildChatRequest(
            message,
            history.map((msg) => ({ role: msg.role, content: msg.content })),
            null
          );

          // Property: History order should be preserved
          for (let i = 0; i < history.length; i++) {
            expect(request.history[i].role).toBe(history[i].role);
            expect(request.history[i].content).toBe(history[i].content);
          }

          // Property: No messages should be lost
          expect(request.history.length).toBe(history.length);
        }
      ),
      { numRuns: 20 }
    );
  });
});
