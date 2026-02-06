/**
 * Streaming JSON Parser
 *
 * This module provides a parser for incomplete JSON streams, implementing:
 * - Bracket balance tracking
 * - Auto-closing of unclosed brackets
 * - Progressive parsing of partial JSON
 * - Markdown code block removal
 *
 * Requirements: 3.7, 3.8, 3.9, 3.10
 */

import type { Itinerary } from "@/types";

/**
 * Bracket balance tracking result
 */
interface BracketBalance {
  isComplete: boolean;
  unclosedBrackets: string[];
}

/**
 * Streaming JSON Parser
 *
 * Handles incomplete JSON by tracking bracket balance and auto-closing
 * unclosed brackets to enable progressive parsing during streaming.
 */
export class StreamingJSONParser {
  private buffer: string = "";
  private bracketStack: string[] = [];

  /**
   * Append new chunk to buffer and attempt to parse
   *
   * @param chunk - New data chunk from stream
   * @returns Partial itinerary if parseable, null otherwise
   */
  appendChunk(chunk: string): Partial<Itinerary> | null {
    this.buffer += chunk;
    return this.tryParse();
  }

  /**
   * Try to parse incomplete JSON by auto-closing brackets
   *
   * @returns Partial itinerary if parseable, null otherwise
   */
  private tryParse(): Partial<Itinerary> | null {
    // Track bracket balance
    const balanced = this.checkBracketBalance(this.buffer);

    if (balanced.isComplete) {
      // JSON is complete, parse normally
      return this.parseComplete(this.buffer);
    } else {
      // JSON is incomplete, try auto-closing
      const completed = this.autoCloseBrackets(this.buffer, balanced);
      return this.parsePartial(completed);
    }
  }

  /**
   * Check bracket balance and track unclosed brackets
   *
   * @param json - JSON string to check
   * @returns Bracket balance information
   */
  private checkBracketBalance(json: string): BracketBalance {
    const stack: string[] = [];
    let inString = false;
    let escapeNext = false;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === "\\") {
        escapeNext = true;
        continue;
      }

      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === "{" || char === "[") {
          stack.push(char);
        } else if (char === "}" || char === "]") {
          stack.pop();
        }
      }
    }

    return {
      isComplete: stack.length === 0,
      unclosedBrackets: stack,
    };
  }

  /**
   * Auto-close unclosed brackets to make valid JSON
   *
   * @param json - Incomplete JSON string
   * @param balance - Bracket balance information
   * @returns JSON string with auto-closed brackets
   */
  private autoCloseBrackets(json: string, balance: BracketBalance): string {
    let completed = json;

    // Close unclosed brackets in reverse order
    for (let i = balance.unclosedBrackets.length - 1; i >= 0; i--) {
      const bracket = balance.unclosedBrackets[i];
      completed += bracket === "{" ? "}" : "]";
    }

    return completed;
  }

  /**
   * Parse complete JSON
   *
   * @param json - Complete JSON string
   * @returns Parsed itinerary or null if parsing fails
   */
  private parseComplete(json: string): Partial<Itinerary> | null {
    try {
      // Remove markdown code blocks if present
      const cleaned = this.cleanJSON(json);
      return JSON.parse(cleaned);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse partial JSON (may be incomplete)
   *
   * @param json - Potentially incomplete JSON string
   * @returns Partial itinerary data or null if parsing fails
   */
  private parsePartial(json: string): Partial<Itinerary> | null {
    try {
      const cleaned = this.cleanJSON(json);
      const parsed = JSON.parse(cleaned);

      // Return partial data even if incomplete
      return {
        title: parsed.title,
        destination: parsed.destination,
        days: parsed.days || [],
      };
    } catch (error) {
      // If parsing fails, return null and wait for more data
      return null;
    }
  }

  /**
   * Clean JSON by removing markdown code blocks
   *
   * @param json - JSON string potentially wrapped in markdown
   * @returns Cleaned JSON string
   */
  private cleanJSON(json: string): string {
    let cleaned = json.trim();

    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    return cleaned;
  }

  /**
   * Get the complete buffer
   *
   * @returns Current buffer contents
   */
  getBuffer(): string {
    return this.buffer;
  }

  /**
   * Reset the parser
   */
  reset(): void {
    this.buffer = "";
    this.bracketStack = [];
  }
}
