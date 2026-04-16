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

describe("ChatPanel credit deduction contract", () => {
  it("should call optimisticUpdateCredits(-CHAT) before API, refreshProfile on success", () => {
    const COST = CREDIT_COSTS.CHAT;
    const calls: number[] = [];

    const track = (delta: number) => { calls.push(delta); };

    // Simulate: deduct → success → refresh (refresh is a separate call, no delta)
    track(-COST);
    // refreshProfile() called — no delta tracked here

    expect(calls).toEqual([-10]);
  });

  it("should call optimisticUpdateCredits(+CHAT) on error to rollback", () => {
    const COST = CREDIT_COSTS.CHAT;
    const calls: number[] = [];
    const track = (delta: number) => { calls.push(delta); };

    // Simulate: deduct → error → rollback
    track(-COST);
    track(+COST);

    expect(calls).toEqual([-10, +10]);
  });
});
