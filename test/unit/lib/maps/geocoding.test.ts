/**
 * Geocoding Utilities Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureLocationData, resolvePlaceWithAPI, hasValidCoordinates } from "@/lib/maps/geocoding";
import type { PartialLocation } from "@/lib/maps/geocoding";

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

// Mock Fetch
const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
});

describe("resolvePlaceWithAPI", () => {
  it("should return null if API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const location: PartialLocation = { name: "Tokyo Tower" };
    const result = await resolvePlaceWithAPI(location);

    expect(result).toBeNull();
  });

  it("should return resolved data on success", async () => {
    mockFetch.mockImplementationOnce(async (url, options) => {
      const body = JSON.parse(options.body);
      const reqId = body.places[0].id;
      return {
        ok: true,
        json: async () => ({
          resolved: [
            {
              id: reqId,
              name: "Tokyo Tower",
              lat: 35.6586,
              lng: 139.7454,
              place_id: "ChIJCewJkL2LGGAR3Qmk0vCTGkg",
            },
          ],
        }),
      };
    });

    const location: PartialLocation = { name: "Tokyo Tower" };
    const result = await resolvePlaceWithAPI(location);

    expect(result).toBeDefined();
    expect(result?.lat).toBe(35.6586);
    expect(result?.lng).toBe(139.7454);
    expect(result?.place_id).toBe("ChIJCewJkL2LGGAR3Qmk0vCTGkg");
  });
});

describe("ensureLocationData", () => {
  it("should return location as-is if it has valid coordinates", async () => {
    const location: PartialLocation = {
      name: "Tokyo Tower",
      lat: 35.6586,
      lng: 139.7454,
      place_id: "ChIJCewJkL2LGGAR3Qmk0vCTGkg",
    };

    const result = await ensureLocationData(location);

    expect(result).toEqual(location);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should resolve via API if coordinates are missing", async () => {
    const location: PartialLocation = {
      name: "Tokyo Tower",
    };

    mockFetch.mockImplementationOnce(async (url, options) => {
      const body = JSON.parse(options.body);
      const reqId = body.places[0].id;
      return {
        ok: true,
        json: async () => ({
          resolved: [
            {
              id: reqId,
              name: "Tokyo Tower",
              lat: 35.6586,
              lng: 139.7454,
              place_id: "ChIJCewJkL2LGGAR3Qmk0vCTGkg",
            },
          ],
        }),
      };
    });

    const result = await ensureLocationData(location);

    expect(result.name).toBe("Tokyo Tower");
    expect(result.lat).toBe(35.6586);
    expect(result.lng).toBe(139.7454);
    expect(result.place_id).toBe("ChIJCewJkL2LGGAR3Qmk0vCTGkg");
    expect(mockFetch).toHaveBeenCalled();
  });

  it("should return null coordinates when geocoding fails", async () => {
    const location: PartialLocation = {
      name: "Unknown Place",
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const result = await ensureLocationData(location);

    expect(result.name).toBe("Unknown Place");
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
    expect(result.place_id).toBeUndefined();
  });

  it("should handle invalid coordinates and resolve via API", async () => {
    const location: PartialLocation = {
      name: "Test Location",
      lat: NaN,
      lng: 200, // Invalid longitude
    };

    mockFetch.mockImplementationOnce(async (url, options) => {
      const body = JSON.parse(options.body);
      const reqId = body.places[0].id;
      return {
        ok: true,
        json: async () => ({
          resolved: [
            {
              id: reqId,
              name: "Test Location",
              lat: 35.6586,
              lng: 139.7454,
              place_id: "test_place_id",
            },
          ],
        }),
      };
    });

    const result = await ensureLocationData(location);

    expect(result.lat).toBe(35.6586);
    expect(result.lng).toBe(139.7454);
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe("hasValidCoordinates", () => {
  it("should return false for null coordinates", () => {
    expect(hasValidCoordinates({ lat: null, lng: null })).toBe(false);
    expect(hasValidCoordinates({ lat: 25, lng: null })).toBe(false);
    expect(hasValidCoordinates({ lat: null, lng: 121 })).toBe(false);
  });
});
