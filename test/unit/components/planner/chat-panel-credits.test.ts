import { describe, it, expect } from "vitest";
import { CREDIT_COSTS } from "@/shared/credit-costs";

describe("CREDIT_COSTS constants", () => {
  it("should define CHAT cost as 10", () => {
    expect(CREDIT_COSTS.CHAT).toBe(10);
  });

  it("should define GENERATE_ITINERARY cost as 100", () => {
    expect(CREDIT_COSTS.GENERATE_ITINERARY).toBe(100);
  });
});
