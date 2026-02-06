/**
 * Unit tests for itinerary parser
 */

import { describe, test, expect } from "vitest";
import { parseItinerary, extractJSON } from "@/lib/ai/parser";

describe("parseItinerary", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000"; // Valid UUID

  test("should parse valid itinerary JSON", async () => {
    const json = {
      title: "Tokyo Trip",
      destination: "Tokyo",
      start_date: "2024-01-01",
      end_date: "2024-01-03",
      days: [
        {
          day_number: 1,
          date: "2024-01-01",
          activities: [
            {
              time: "09:00",
              title: "Visit Temple",
              description: "Morning temple visit",
              location: {
                name: "Senso-ji",
                lat: 35.7148,
                lng: 139.7967,
              },
              duration_minutes: 120,
            },
          ],
        },
      ],
    };

    const result = await parseItinerary(json, userId);

    expect(result.title).toBe("Tokyo Trip");
    expect(result.destination).toBe("Tokyo");
    expect(result.user_id).toBe(userId);
    expect(result.days).toHaveLength(1);
    expect(result.days[0].activities).toHaveLength(1);
  });

  test("should parse JSON string", async () => {
    const jsonString = JSON.stringify({
      destination: "Paris",
      start_date: "2024-02-01",
      end_date: "2024-02-02",
      days: [
        {
          day_number: 1,
          date: "2024-02-01",
          activities: [],
        },
      ],
    });

    const result = await parseItinerary(jsonString, userId);

    expect(result.destination).toBe("Paris");
  });

  test("should generate IDs for missing fields", async () => {
    const json = {
      destination: "London",
      start_date: "2024-03-01",
      end_date: "2024-03-01",
      days: [
        {
          date: "2024-03-01",
          activities: [
            {
              time: "10:00",
              title: "Activity",
              location: {
                name: "Place",
                lat: 51.5074,
                lng: -0.1278,
              },
            },
          ],
        },
      ],
    };

    const result = await parseItinerary(json, userId);

    expect(result.id).toBeDefined();
    expect(result.days[0].activities[0].id).toBeDefined();
  });

  test("should throw error for invalid data", async () => {
    const invalidJson = {
      // Missing required fields
      destination: "Test",
    };

    await expect(parseItinerary(invalidJson, userId)).rejects.toThrow();
  });
});

describe("extractJSON", () => {
  test("should extract JSON from markdown code block", () => {
    const text = '```json\n{"key": "value"}\n```';
    const result = extractJSON(text);

    expect(result).toBe('{"key": "value"}');
  });

  test("should extract JSON from generic code block", () => {
    const text = '```\n{"key": "value"}\n```';
    const result = extractJSON(text);

    expect(result).toBe('{"key": "value"}');
  });

  test("should extract JSON from plain text", () => {
    const text = 'Here is the data: {"key": "value"} and more text';
    const result = extractJSON(text);

    expect(result).toBe('{"key": "value"}');
  });

  test("should return null if no JSON found", () => {
    const text = "No JSON here";
    const result = extractJSON(text);

    expect(result).toBeNull();
  });
});
