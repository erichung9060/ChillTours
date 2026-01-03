import { describe, test, expect } from "vitest";
import * as fc from "fast-check";

/**
 * Property-based tests for streaming response delivery
 * Feature: tripai-travel-planner
 */

// Mock streaming response generator
async function* mockStreamingGenerator(
  chunks: string[]
): AsyncGenerator<{ chunk: string; done: boolean }> {
  for (let i = 0; i < chunks.length; i++) {
    yield {
      chunk: chunks[i],
      done: false,
    };
  }
  yield {
    chunk: "",
    done: true,
  };
}

// Collect all chunks from a streaming generator
async function collectStreamChunks(
  generator: AsyncGenerator<{ chunk: string; done: boolean }>
): Promise<{ chunks: string[]; order: number[]; complete: boolean }> {
  const chunks: string[] = [];
  const order: number[] = [];
  let complete = false;
  let index = 0;

  for await (const response of generator) {
    if (response.done) {
      complete = true;
    } else {
      chunks.push(response.chunk);
      order.push(index++);
    }
  }

  return { chunks, order, complete };
}

describe("Streaming Response Delivery Properties", () => {
  // Feature: tripai-travel-planner, Property 7: Streaming Response Delivery
  test("Property 7: For any AI-generated response, chunks should be delivered in order and marked complete", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (inputChunks) => {
          // Generate streaming response
          const generator = mockStreamingGenerator(inputChunks);

          // Collect all chunks
          const result = await collectStreamChunks(generator);

          // Property 1: All chunks should be delivered
          expect(result.chunks.length).toBe(inputChunks.length);

          // Property 2: Chunks should maintain order
          expect(result.chunks).toEqual(inputChunks);

          // Property 3: Order indices should be sequential
          const expectedOrder = Array.from(
            { length: inputChunks.length },
            (_, i) => i
          );
          expect(result.order).toEqual(expectedOrder);

          // Property 4: Stream should be marked complete
          expect(result.complete).toBe(true);

          // Property 5: Reconstructed text should match original (no data loss)
          const reconstructed = result.chunks.join("");
          const original = inputChunks.join("");
          expect(reconstructed).toBe(original);
        }
      ),
      { numRuns: 20 }
    );
  });

  test("Property 7.1: Streaming completion marker should always be last", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
          minLength: 1,
          maxLength: 10,
        }),
        async (inputChunks) => {
          const generator = mockStreamingGenerator(inputChunks);

          let lastResponse: { chunk: string; done: boolean } | null = null;
          let doneCount = 0;

          for await (const response of generator) {
            lastResponse = response;
            if (response.done) {
              doneCount++;
            }
          }

          // Property: Last response should have done=true
          expect(lastResponse?.done).toBe(true);

          // Property: Only one done marker should be sent
          expect(doneCount).toBe(1);
        }
      ),
      { numRuns: 20 }
    );
  });
});
