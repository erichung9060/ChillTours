/**
 * Unit tests for itinerary parser
 */

import { describe, test, expect } from "vitest";
import { extractJSON } from "@/lib/ai/parser";

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
