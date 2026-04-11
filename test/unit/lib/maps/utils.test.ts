import { describe, expect, it } from "vitest";
import { createDirectionsLink, createPlaceSearchLink } from "@/lib/maps/utils";
import type { Location } from "@/types/itinerary";

describe("Google Maps URL builders", () => {
  it("builds a directions URL with destination and destination_place_id", () => {
    const location: Location = {
      name: "Taipei 101",
      place_id: "ChIJH56c2rarQjQRphR5_FK0zuM",
    };

    expect(createDirectionsLink(location)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Taipei%20101&destination_place_id=ChIJH56c2rarQjQRphR5_FK0zuM",
    );
  });

  it("builds a directions URL with destination when place_id is missing", () => {
    const location: Location = {
      name: "Taipei 101",
    };

    expect(createDirectionsLink(location)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Taipei%20101",
    );
  });

  it("builds a place-search URL with query and query_place_id", () => {
    const location: Location = {
      name: "Taipei 101",
      place_id: "ChIJH56c2rarQjQRphR5_FK0zuM",
    };

    expect(createPlaceSearchLink(location)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Taipei%20101&query_place_id=ChIJH56c2rarQjQRphR5_FK0zuM",
    );
  });

  it("builds a place-search URL with query when place_id is missing", () => {
    const location: Location = {
      name: "Taipei 101",
    };

    expect(createPlaceSearchLink(location)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Taipei%20101",
    );
  });
});
