/**
 * Itinerary Parser
 *
 * This module provides parsing utilities for converting AI-generated
 * responses into structured Itinerary objects.
 *
 * Requirements: 3.4, 3.5
 */

/**
 * Extract JSON from AI response that may contain text
 *
 * @param response - AI response potentially containing JSON
 * @returns Extracted JSON string or null
 */
export function extractJSON(response: string): string | null {
  // Try to find JSON in markdown code blocks
  const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1];
  }

  // Try to find JSON object directly
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}
