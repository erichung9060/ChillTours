/**
 * Geocoding Utilities Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureLocationData, geocodeLocation } from "@/lib/maps/geocoding";
import type { PartialLocation } from "@/lib/maps/geocoding";

// Mock Google Maps API
const mockGeocode = vi.fn();

beforeEach(() => {
  // Setup Google Maps mock
  global.window = {
    google: {
      maps: {
        Geocoder: class {
          geocode = mockGeocode;
        },
      },
    },
  } as any;

  mockGeocode.mockClear();
});

describe("ensureLocationData", () => {
  it("should return location as-is if it has valid coordinates and place_id", async () => {
    const location: PartialLocation = {
      name: "Tokyo Tower",
      lat: 35.6586,
      lng: 139.7454,
      place_id: "ChIJCewJkL2LGGAR3Qmk0vCTGkg",
    };

    const result = await ensureLocationData(location);

    expect(result).toEqual(location);
    expect(mockGeocode).not.toHaveBeenCalled();
  });

  it("should geocode if coordinates are missing", async () => {
    const location: PartialLocation = {
      name: "Tokyo Tower",
    };

    mockGeocode.mockResolvedValue({
      results: [
        {
          geometry: {
            location: {
              lat: () => 35.6586,
              lng: () => 139.7454,
            },
          },
          place_id: "ChIJCewJkL2LGGAR3Qmk0vCTGkg",
          formatted_address: "Tokyo Tower, Tokyo, Japan",
        },
      ],
    });

    const result = await ensureLocationData(location);

    expect(result.name).toBe("Tokyo Tower");
    expect(result.lat).toBe(35.6586);
    expect(result.lng).toBe(139.7454);
    expect(result.place_id).toBe("ChIJCewJkL2LGGAR3Qmk0vCTGkg");
    expect(mockGeocode).toHaveBeenCalledWith({ address: "Tokyo Tower" });
  });

  it("should return coordinates as-is without fetching place_id", async () => {
    const location: PartialLocation = {
      name: "Tokyo Tower",
      lat: 35.6586,
      lng: 139.7454,
    };

    const result = await ensureLocationData(location);

    expect(result.lat).toBe(35.6586);
    expect(result.lng).toBe(139.7454);
    expect(result.place_id).toBeUndefined();
    expect(mockGeocode).not.toHaveBeenCalled(); // Should NOT geocode
  });

  it("should return default coordinates if geocoding fails", async () => {
    const location: PartialLocation = {
      name: "Unknown Place",
    };

    mockGeocode.mockResolvedValue({
      results: [],
    });

    const result = await ensureLocationData(location);

    expect(result.name).toBe("Unknown Place");
    expect(result.lat).toBe(0);
    expect(result.lng).toBe(0);
    expect(result.place_id).toBeUndefined();
  });

  it("should handle invalid coordinates", async () => {
    const location: PartialLocation = {
      name: "Test Location",
      lat: NaN,
      lng: 200, // Invalid longitude
    };

    mockGeocode.mockResolvedValue({
      results: [
        {
          geometry: {
            location: {
              lat: () => 35.6586,
              lng: () => 139.7454,
            },
          },
          place_id: "test_place_id",
          formatted_address: "Test Location",
        },
      ],
    });

    const result = await ensureLocationData(location);

    expect(result.lat).toBe(35.6586);
    expect(result.lng).toBe(139.7454);
    expect(mockGeocode).toHaveBeenCalled();
  });
});

describe("geocodeLocation", () => {
  it("should geocode a location name", async () => {
    mockGeocode.mockResolvedValue({
      results: [
        {
          geometry: {
            location: {
              lat: () => 35.6586,
              lng: () => 139.7454,
            },
          },
          place_id: "ChIJCewJkL2LGGAR3Qmk0vCTGkg",
          formatted_address: "Tokyo Tower, Tokyo, Japan",
        },
      ],
    });

    const result = await geocodeLocation("Tokyo Tower");

    expect(result).toEqual({
      lat: 35.6586,
      lng: 139.7454,
      place_id: "ChIJCewJkL2LGGAR3Qmk0vCTGkg",
      formatted_address: "Tokyo Tower, Tokyo, Japan",
    });
  });

  it("should return null if no results found", async () => {
    mockGeocode.mockResolvedValue({
      results: [],
    });

    const result = await geocodeLocation("Unknown Place");

    expect(result).toBeNull();
  });

  it("should return null if Google Maps API is not loaded", async () => {
    global.window = {} as any;

    const result = await geocodeLocation("Tokyo Tower");

    expect(result).toBeNull();
  });
});
