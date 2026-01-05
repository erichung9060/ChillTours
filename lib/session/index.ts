/**
 * Session Management Module
 * 
 * Provides in-memory session state management for chat history and itinerary context.
 * Sessions are ephemeral and cleared on page refresh.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * Note: 
 * - The useSession hook is exported from @/hooks/use-session for consistency
 * - Types are exported from @/types/session for centralized type management
 */

export { SessionProvider, useSessionContext } from './session-provider';
export type { SessionState, SessionContextValue } from '@/types/session';
