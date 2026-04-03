/**
 * Geographic Utilities Tests
 */

import { describe, it, expect } from "vitest";
import { hasValidCoordinates } from "@/lib/utils/geo";

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
