/**
 * Place Resolver Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolvePlaceDetails, hasValidCoordinates } from "@/lib/places/place-resolver";
import type { PartialLocation } from "@/lib/places/place-resolver";

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

describe("resolvePlaceDetails", () => {
  it("should return full place details on success", async () => {
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
              rating: 4.5,
              user_ratings_total: 1200,
              opening_hours: { periods: [] },
              website: "https://www.tokyotower.co.jp",
            },
          ],
        }),
      };
    });

    const result = await resolvePlaceDetails({ name: "Tokyo Tower" });

    expect(result.name).toBe("Tokyo Tower");
    expect(result.lat).toBe(35.6586);
    expect(result.lng).toBe(139.7454);
    expect(result.place_id).toBe("ChIJCewJkL2LGGAR3Qmk0vCTGkg");
    expect(result.rating).toBe(4.5);
    expect(result.user_ratings_total).toBe(1200);
    expect(result.opening_hours).toEqual({ periods: [] });
    expect(result.website).toBe("https://www.tokyotower.co.jp");
  });

  it("should return null coordinates when API returns HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await resolvePlaceDetails({ name: "Unknown Place" });

    expect(result.name).toBe("Unknown Place");
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
  });

  it("should return null coordinates when API returns NOT_FOUND", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          resolved: [{ id: expect.any(String), error: "NOT_FOUND" }],
        }),
    });

    const result = await resolvePlaceDetails({ name: "Nonexistent" });

    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
  });

  it("should return null coordinates when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await resolvePlaceDetails({ name: "Offline Place" });

    expect(result.name).toBe("Offline Place");
    expect(result.lat).toBeNull();
    expect(result.lng).toBeNull();
  });

  it("should preserve existing coordinates when API returns HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const result = await resolvePlaceDetails({
      name: "Known Place",
      lat: 25.033,
      lng: 121.5654,
    });

    expect(result.name).toBe("Known Place");
    expect(result.lat).toBe(25.033);
    expect(result.lng).toBe(121.5654);
  });

  it("should preserve existing coordinates when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await resolvePlaceDetails({
      name: "Known Offline Place",
      lat: 35.6586,
      lng: 139.7454,
    });

    expect(result.name).toBe("Known Offline Place");
    expect(result.lat).toBe(35.6586);
    expect(result.lng).toBe(139.7454);
  });
});

describe("hasValidCoordinates", () => {
  it("should return true for valid coordinates", () => {
    expect(hasValidCoordinates({ lat: 25, lng: 121 })).toBe(true);
    expect(hasValidCoordinates({ lat: -90, lng: -180 })).toBe(true);
    expect(hasValidCoordinates({ lat: 90, lng: 180 })).toBe(true);
  });

  it("should return false for null coordinates", () => {
    expect(hasValidCoordinates({ lat: null, lng: null })).toBe(false);
    expect(hasValidCoordinates({ lat: 25, lng: null })).toBe(false);
    expect(hasValidCoordinates({ lat: null, lng: 121 })).toBe(false);
  });

  it("should return false for undefined coordinates", () => {
    expect(hasValidCoordinates({})).toBe(false);
    expect(hasValidCoordinates({ lat: 25 })).toBe(false);
    expect(hasValidCoordinates({ lng: 121 })).toBe(false);
  });

  it("should return false for NaN coordinates", () => {
    expect(hasValidCoordinates({ lat: NaN, lng: 121 })).toBe(false);
    expect(hasValidCoordinates({ lat: 25, lng: NaN })).toBe(false);
  });

  it("should return false for out-of-range coordinates", () => {
    expect(hasValidCoordinates({ lat: 91, lng: 121 })).toBe(false);
    expect(hasValidCoordinates({ lat: 25, lng: 181 })).toBe(false);
  });
});
