/**
 * Gemini Integration Module
 * 
 * Exports all Gemini-related functionality for AI-powered itinerary generation
 * and conversational chat.
 */

export { GeminiClient, geminiClient, GeminiError } from './client';
export type { GenerateItineraryOptions, ChatOptions, StreamingCallback } from './client';

export { StreamingJSONParser } from './streaming-parser';

export {
  parseItinerary,
  parseItineraryUpdate,
  detectItineraryModification,
  extractJSON,
} from './parser';
