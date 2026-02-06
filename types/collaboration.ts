import { z } from "zod";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

// ============================================================================
// User Presence Types
// ============================================================================

export const UserPresenceSchema = z.object({
  user_id: z.uuid(),
  name: z.string().min(1),
  online: z.boolean(),
});

export type UserPresence = z.infer<typeof UserPresenceSchema>;

// ============================================================================
// Collaboration Session Types
// ============================================================================

// Note: Y.Doc and WebsocketProvider are not serializable and cannot be validated with Zod
// We define the interface separately for these runtime objects

export interface CollaborationSession {
  room_id: string; // Same as itinerary_id
  doc: Y.Doc; // Yjs document
  provider: WebsocketProvider;
}

// For validation of the room_id when creating a session
export const CollaborationSessionConfigSchema = z.object({
  room_id: z.uuid(),
});

export type CollaborationSessionConfig = z.infer<
  typeof CollaborationSessionConfigSchema
>;
