import { describe, it, expect } from "vitest";
import { calculateMapBounds } from "@/lib/maps/client";
import type { Location } from "@/types/itinerary";

describe("calculateMapBounds", () => {
  it("should filter out locations with null coordinates", () => {
    const locations: Location[] = [
      { name: "Valid", lat: 25, lng: 121 },
      { name: "Null coords", lat: null, lng: null },
      { name: "Also valid", lat: 26, lng: 122 },
    ];

    const result = calculateMapBounds(locations);

    // Should only consider valid locations
    expect(result.center.lat).toBeCloseTo(25.5, 1);
    expect(result.center.lng).toBeCloseTo(121.5, 1);
  });

  it("should return default center when all locations have null coordinates", () => {
    const locations: Location[] = [
      { name: "Null 1", lat: null, lng: null },
      { name: "Null 2", lat: null, lng: null },
    ];

    const result = calculateMapBounds(locations);

    expect(result.center).toEqual({ lat: 0, lng: 0 });
    expect(result.zoom).toBe(2);
  });
});
