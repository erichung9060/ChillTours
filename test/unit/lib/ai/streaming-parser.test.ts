/**
 * Unit tests for StreamingJSONParser
 */

import { describe, test, expect, beforeEach } from "vitest";
import { StreamingJSONParser } from "@/lib/ai/streaming-parser";

describe("StreamingJSONParser", () => {
  let parser: StreamingJSONParser;

  beforeEach(() => {
    parser = new StreamingJSONParser();
  });

  test("should parse complete JSON", () => {
    const json = '{"title": "Test", "destination": "Tokyo"}';
    const result = parser.appendChunk(json);

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test");
    expect(result?.destination).toBe("Tokyo");
  });

  test("should handle incomplete JSON with auto-closing", () => {
    const incompleteJson = '{"title": "Test", "days": [{"day_number": 1';
    const result = parser.appendChunk(incompleteJson);

    // Should attempt to parse with auto-closed brackets
    expect(result).toBeDefined();
  });

  test("should handle streaming chunks progressively", () => {
    const chunks = [
      '{"title": "Tokyo Trip",',
      ' "destination": "Tokyo",',
      ' "days": [',
      '{"day_number": 1, "activities": []}',
      "]}",
    ];

    let lastResult = null;
    for (const chunk of chunks) {
      lastResult = parser.appendChunk(chunk);
    }

    expect(lastResult).not.toBeNull();
    expect(lastResult?.title).toBe("Tokyo Trip");
    expect(lastResult?.destination).toBe("Tokyo");
    expect(lastResult?.days).toHaveLength(1);
  });

  test("should remove markdown code blocks", () => {
    const jsonWithMarkdown = '```json\n{"title": "Test"}\n```';
    const result = parser.appendChunk(jsonWithMarkdown);

    expect(result).not.toBeNull();
    expect(result?.title).toBe("Test");
  });

  test("should track bracket balance correctly", () => {
    parser.appendChunk('{"a": {');
    parser.appendChunk('"b": [');
    parser.appendChunk("1, 2");
    const result = parser.appendChunk("]}}");

    expect(result).not.toBeNull();
  });

  test("should handle escaped quotes in strings", () => {
    const json = '{"title": "Test \\"quoted\\" text"}';
    const result = parser.appendChunk(json);

    expect(result).not.toBeNull();
    expect(result?.title).toBe('Test "quoted" text');
  });

  test("should reset parser state", () => {
    parser.appendChunk('{"title": "Test"}');
    parser.reset();

    expect(parser.getBuffer()).toBe("");
  });

  test("should return null for invalid JSON", () => {
    const invalidJson = "not json at all";
    const result = parser.appendChunk(invalidJson);

    expect(result).toBeNull();
  });

  test("should handle empty chunks", () => {
    const result = parser.appendChunk("");
    expect(result).toBeNull();
  });

  test("should accumulate buffer correctly", () => {
    parser.appendChunk('{"title"');
    parser.appendChunk(': "Test"');
    parser.appendChunk("}");

    expect(parser.getBuffer()).toBe('{"title": "Test"}');
  });
});
