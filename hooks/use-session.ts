/**
 * Session Management Hook
 * 
 * Provides convenient access to session state and operations.
 * Manages in-memory chat history and itinerary context.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 * 
 * @example
 * ```tsx
 * import { useSession } from '@/hooks/use-session';
 * 
 * function ChatComponent() {
 *   const { session, addMessage, getChatHistory } = useSession();
 *   
 *   const handleSend = (text: string) => {
 *     addMessage({
 *       id: generateId(),
 *       role: 'user',
 *       content: text,
 *       timestamp: Date.now(),
 *     });
 *   };
 *   
 *   return (
 *     <div>
 *       {getChatHistory().map(msg => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */

export { useSessionContext as useSession } from '@/lib/session/session-provider';
export type { SessionState, SessionContextValue } from '@/types/session';
