/**
 * Session Provider Component
 * 
 * Provides session state management using React Context.
 * Sessions are stored in memory only and cleared on page refresh.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { SessionState, SessionContextValue } from '@/types/session';
import type { ChatMessage } from '@/types/chat';
import type { Itinerary } from '@/types/itinerary';

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create initial session state
 */
function createInitialSession(): SessionState {
  return {
    session_id: generateSessionId(),
    chat_history: [],
    current_itinerary: null,
    created_at: Date.now(),
  };
}

// Create context with undefined default (will be provided by SessionProvider)
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

interface SessionProviderProps {
  children: React.ReactNode;
}

/**
 * Session Provider Component
 * 
 * Manages in-memory session state including chat history.
 * Creates a fresh session on every page load.
 * 
 * @example
 * ```tsx
 * <SessionProvider>
 *   <App />
 * </SessionProvider>
 * ```
 */
export function SessionProvider({ children }: SessionProviderProps) {
  // Initialize with fresh session state
  // This ensures a new session on every page load (Requirement 9.1)
  const [session, setSession] = useState<SessionState>(createInitialSession);

  /**
   * Add a message to chat history
   * Stored in memory only (Requirement 9.2)
   */
  const addMessage = useCallback((message: ChatMessage) => {
    setSession((prev) => ({
      ...prev,
      chat_history: [...prev.chat_history, message],
    }));
  }, []);

  /**
   * Clear all chat history
   */
  const clearChatHistory = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      chat_history: [],
    }));
  }, []);

  /**
   * Set the current itinerary
   */
  const setCurrentItinerary = useCallback((itinerary: Itinerary | null) => {
    setSession((prev) => ({
      ...prev,
      current_itinerary: itinerary,
    }));
  }, []);

  /**
   * Get all chat messages
   */
  const getChatHistory = useCallback((): ChatMessage[] => {
    return session.chat_history;
  }, [session.chat_history]);

  /**
   * Reset the entire session
   * Creates a new session ID and clears all data
   */
  const resetSession = useCallback(() => {
    setSession(createInitialSession());
  }, []);

  // Ensure session is cleared on page refresh (Requirement 9.3)
  // This is automatically handled by React state initialization
  // No persistence to localStorage or sessionStorage (Requirement 9.4, 9.5)

  const contextValue: SessionContextValue = {
    session,
    addMessage,
    clearChatHistory,
    setCurrentItinerary,
    getChatHistory,
    resetSession,
  };

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session context
 * 
 * @throws Error if used outside SessionProvider
 * 
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { session, addMessage } = useSessionContext();
 *   
 *   const handleSend = (text: string) => {
 *     addMessage({
 *       id: generateId(),
 *       role: 'user',
 *       content: text,
 *       timestamp: Date.now(),
 *     });
 *   };
 * }
 * ```
 */
export function useSessionContext(): SessionContextValue {
  const context = useContext(SessionContext);
  
  if (context === undefined) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }
  
  return context;
}
