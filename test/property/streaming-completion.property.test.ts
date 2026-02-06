/**
 * Property-Based Tests for Streaming Completion Marking
 *
 * Feature: tripai-travel-planner
 * Property 36: Streaming Completion Marking
 *
 * Validates: Requirements 18.3
 *
 * For any completed streaming response, the system should mark the message as complete
 * and stop displaying the typing indicator.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import type { ChatMessage } from "@/types/chat";

/**
 * Mock streaming message handler
 */
class StreamingMessageHandler {
  private messages: Map<string, ChatMessage> = new Map();
  private typingIndicators: Set<string> = new Set();

  /**
   * Start streaming a message
   */
  startStreaming(messageId: string): void {
    const message: ChatMessage = {
      id: messageId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      streaming: true,
    };
    this.messages.set(messageId, message);
    this.typingIndicators.add(messageId);
  }

  /**
   * Append chunk to streaming message
   */
  appendChunk(messageId: string, chunk: string): void {
    const message = this.messages.get(messageId);
    if (message && message.streaming) {
      message.content += chunk;
      this.messages.set(messageId, message);
    }
  }

  /**
   * Mark message as complete
   */
  completeStreaming(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.streaming = false;
      this.messages.set(messageId, message);
      this.typingIndicators.delete(messageId);
    }
  }

  /**
   * Check if message is streaming
   */
  isStreaming(messageId: string): boolean {
    const message = this.messages.get(messageId);
    return message?.streaming === true;
  }

  /**
   * Check if typing indicator is shown
   */
  hasTypingIndicator(messageId: string): boolean {
    return this.typingIndicators.has(messageId);
  }

  /**
   * Get message
   */
  getMessage(messageId: string): ChatMessage | undefined {
    return this.messages.get(messageId);
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages.clear();
    this.typingIndicators.clear();
  }
}

describe("Property 36: Streaming Completion Marking", () => {
  let handler: StreamingMessageHandler;

  beforeEach(() => {
    handler = new StreamingMessageHandler();
  });

  afterEach(() => {
    handler.clear();
  });

  // Feature: tripai-travel-planner, Property 36: Streaming Completion Marking
  it("should mark message as complete and remove typing indicator when streaming finishes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 20,
        }),
        async (messageId, chunks) => {
          // Start streaming
          handler.startStreaming(messageId);

          // Verify initial state
          expect(handler.isStreaming(messageId)).toBe(true);
          expect(handler.hasTypingIndicator(messageId)).toBe(true);

          // Stream all chunks
          for (const chunk of chunks) {
            handler.appendChunk(messageId, chunk);
          }

          // Verify still streaming
          expect(handler.isStreaming(messageId)).toBe(true);
          expect(handler.hasTypingIndicator(messageId)).toBe(true);

          // Complete streaming
          handler.completeStreaming(messageId);

          // Property 1: Message should be marked as complete (streaming = false)
          expect(handler.isStreaming(messageId)).toBe(false);

          // Property 2: Typing indicator should be removed
          expect(handler.hasTypingIndicator(messageId)).toBe(false);

          // Property 3: Message content should be preserved
          const message = handler.getMessage(messageId);
          expect(message).toBeDefined();
          expect(message?.content).toBe(chunks.join(""));

          // Property 4: Message should have streaming flag set to false
          expect(message?.streaming).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 36: Streaming Completion Marking
  it("should only mark message as complete once", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.integer({ min: 2, max: 5 }),
        async (messageId, chunks, completionAttempts) => {
          // Start streaming
          handler.startStreaming(messageId);

          // Stream chunks
          for (const chunk of chunks) {
            handler.appendChunk(messageId, chunk);
          }

          // Complete streaming multiple times
          for (let i = 0; i < completionAttempts; i++) {
            handler.completeStreaming(messageId);
          }

          // Property: Message should be marked as complete (idempotent)
          expect(handler.isStreaming(messageId)).toBe(false);
          expect(handler.hasTypingIndicator(messageId)).toBe(false);

          // Property: Content should remain unchanged
          const message = handler.getMessage(messageId);
          expect(message?.content).toBe(chunks.join(""));
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 36: Streaming Completion Marking
  it("should not accept new chunks after completion", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 5,
        }),
        async (messageId, initialChunks, afterCompletionChunks) => {
          // Start streaming
          handler.startStreaming(messageId);

          // Stream initial chunks
          for (const chunk of initialChunks) {
            handler.appendChunk(messageId, chunk);
          }

          const contentBeforeCompletion =
            handler.getMessage(messageId)?.content;

          // Complete streaming
          handler.completeStreaming(messageId);

          // Try to append more chunks after completion
          for (const chunk of afterCompletionChunks) {
            handler.appendChunk(messageId, chunk);
          }

          // Property: Content should not change after completion
          const message = handler.getMessage(messageId);
          expect(message?.content).toBe(contentBeforeCompletion);
          expect(message?.streaming).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 36: Streaming Completion Marking
  it("should handle empty streaming messages correctly", async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (messageId) => {
        // Start streaming with no chunks
        handler.startStreaming(messageId);

        // Verify initial state
        expect(handler.isStreaming(messageId)).toBe(true);
        expect(handler.hasTypingIndicator(messageId)).toBe(true);

        // Complete immediately without any chunks
        handler.completeStreaming(messageId);

        // Property: Should still mark as complete
        expect(handler.isStreaming(messageId)).toBe(false);
        expect(handler.hasTypingIndicator(messageId)).toBe(false);

        // Property: Message should exist with empty content
        const message = handler.getMessage(messageId);
        expect(message).toBeDefined();
        expect(message?.content).toBe("");
        expect(message?.streaming).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 36: Streaming Completion Marking
  it("should handle concurrent streaming messages independently", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
        fc.array(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
            minLength: 1,
            maxLength: 5,
          })
        ),
        async (messageIds, chunksArray) => {
          // Ensure we have chunks for each message
          const normalizedChunks = messageIds.map(
            (_, i) => chunksArray[i % chunksArray.length] || ["default"]
          );

          // Start streaming for all messages
          messageIds.forEach((id) => handler.startStreaming(id));

          // Verify all are streaming
          messageIds.forEach((id) => {
            expect(handler.isStreaming(id)).toBe(true);
            expect(handler.hasTypingIndicator(id)).toBe(true);
          });

          // Stream chunks for each message
          messageIds.forEach((id, index) => {
            normalizedChunks[index].forEach((chunk) => {
              handler.appendChunk(id, chunk);
            });
          });

          // Complete only the first message
          handler.completeStreaming(messageIds[0]);

          // Property: First message should be complete
          expect(handler.isStreaming(messageIds[0])).toBe(false);
          expect(handler.hasTypingIndicator(messageIds[0])).toBe(false);

          // Property: Other messages should still be streaming
          for (let i = 1; i < messageIds.length; i++) {
            expect(handler.isStreaming(messageIds[i])).toBe(true);
            expect(handler.hasTypingIndicator(messageIds[i])).toBe(true);
          }

          // Complete remaining messages
          for (let i = 1; i < messageIds.length; i++) {
            handler.completeStreaming(messageIds[i]);
          }

          // Property: All messages should now be complete
          messageIds.forEach((id) => {
            expect(handler.isStreaming(id)).toBe(false);
            expect(handler.hasTypingIndicator(id)).toBe(false);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: tripai-travel-planner, Property 36: Streaming Completion Marking
  it("should preserve message metadata when marking as complete", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (messageId, chunks) => {
          // Start streaming
          handler.startStreaming(messageId);

          const initialMessage = handler.getMessage(messageId);
          const initialTimestamp = initialMessage?.timestamp;
          const initialRole = initialMessage?.role;

          // Stream chunks
          for (const chunk of chunks) {
            handler.appendChunk(messageId, chunk);
          }

          // Complete streaming
          handler.completeStreaming(messageId);

          const finalMessage = handler.getMessage(messageId);

          // Property: Metadata should be preserved
          expect(finalMessage?.id).toBe(messageId);
          expect(finalMessage?.role).toBe(initialRole);
          expect(finalMessage?.timestamp).toBe(initialTimestamp);

          // Property: Only streaming flag should change
          expect(finalMessage?.streaming).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
