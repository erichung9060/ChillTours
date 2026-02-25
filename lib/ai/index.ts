/**
 * AI Integration Module
 *
 * Exports all AI-related functionality for AI-powered itinerary generation
 * and conversational chat.
 */

export { AIClient, aiClient, AIError } from "./client";
export type {
  ChatOptions,
  SSEActivityEvent,
  SSECompleteEvent,
  SSEErrorEvent,
} from "./client";

export { parseItinerary, extractJSON } from "./parser";

export {
  parseOperations,
  applyOperations,
  type Operation,
  type OperationsUpdate,
  type AddOperation,
  type RemoveOperation,
  type UpdateOperation,
  type MoveOperation,
  type ReorderOperation,
} from "./operations";
