import { z } from 'zod';
import { Itinerary, ItinerarySchema, DaySchema } from './itinerary';

// ============================================================================
// Chat Message Types
// ============================================================================

export const ChatMessageSchema = z.object({
  id: z.uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.number().int().positive(),
  streaming: z.boolean().optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// ============================================================================
// Chat Session Types
// ============================================================================

export const ChatSessionSchema = z.object({
  session_id: z.uuid(),
  messages: z.array(ChatMessageSchema),
  itinerary_context: ItinerarySchema.nullable(),
});

export type ChatSession = z.infer<typeof ChatSessionSchema>;

// ============================================================================
// Streaming Response Types
// ============================================================================

// Note: We use a separate schema for partial itinerary updates to avoid .partial() on refined schemas
export const PartialItineraryUpdateSchema = z.object({
  id: z.uuid().optional(),
  user_id: z.uuid().optional(),
  title: z.string().min(1).max(100).optional(),
  destination: z.string().min(1).max(100).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.array(DaySchema).min(1).optional(),
  created_at: z.iso.datetime().optional(),
  updated_at: z.iso.datetime().optional(),
  shared_with: z.array(z.uuid()).optional(),
});

export const StreamingResponseMetadataSchema = z.object({
  itinerary_updates: PartialItineraryUpdateSchema.optional(),
});

export const StreamingResponseSchema = z.object({
  chunk: z.string(),
  done: z.boolean(),
  metadata: StreamingResponseMetadataSchema.optional(),
});

export type StreamingResponse = z.infer<typeof StreamingResponseSchema>;
export type StreamingResponseMetadata = z.infer<typeof StreamingResponseMetadataSchema>;
