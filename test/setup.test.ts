import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

describe("Test Infrastructure Setup", () => {
  it("should run basic unit tests", () => {
    expect(true).toBe(true);
  });

  it("should support property-based testing with fast-check", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  it("should have access to test helpers", async () => {
    const { createMockItinerary } = await import("./utils/test-helpers");
    const mockItinerary = createMockItinerary();
    expect(mockItinerary).toBeDefined();
    expect(mockItinerary.id).toBe("test-id");
  });

  it("should have access to property test helpers", async () => {
    const { itineraryArbitrary } =
      await import("./utils/property-test-helpers");
    expect(itineraryArbitrary).toBeDefined();
  });
});
