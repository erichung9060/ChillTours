import { z } from 'zod';
import { ChatMessageSchema } from './chat';
import { ItinerarySchema } from './itinerary';

// ============================================================================
// Session State Types
// ============================================================================

/**
 * Session state stored in memory only
 * Never persisted to database or localStorage
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export const SessionStateSchema = z.object({
  /** Unique session identifier (generated on page load) */
  session_id: z.string(),
  
  /** In-memory chat history for current session */
  chat_history: z.array(ChatMessageSchema),
  
  /** Current itinerary being worked on (if any) */
  current_itinerary: ItinerarySchema.nullable(),
  
  /** Timestamp when session was created */
  created_at: z.number().int().positive(),
});

export type SessionState = z.infer<typeof SessionStateSchema>;

// ============================================================================
// Session Context Types
// ============================================================================

/**
 * Session context value provided to components
 */
export interface SessionContextValue {
  /** Current session state */
  session: SessionState;
  
  /** Add a message to chat history */
  addMessage: (message: z.infer<typeof ChatMessageSchema>) => void;
  
  /** Clear all chat history */
  clearChatHistory: () => void;
  
  /** Set the current itinerary */
  setCurrentItinerary: (itinerary: z.infer<typeof ItinerarySchema> | null) => void;
  
  /** Get all chat messages */
  getChatHistory: () => z.infer<typeof ChatMessageSchema>[];
  
  /** Reset the entire session (creates new session ID) */
  resetSession: () => void;
}
