/**
 * AI Integration Module
 * 
 * Exports all AI-related functionality for AI-powered itinerary generation
 * and conversational chat.
 */

export { AIClient, aiClient, AIError } from './client';
export type { GenerateItineraryOptions, ChatOptions, StreamingCallback } from './client';

export { StreamingJSONParser } from './streaming-parser';

export {
  parseItinerary,
  parseItineraryUpdate,
  detectItineraryModification,
  extractJSON,
} from './parser';
