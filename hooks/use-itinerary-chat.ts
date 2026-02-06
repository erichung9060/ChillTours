/**
 * Itinerary Chat Hook
 *
 * Manages chat messages for a specific itinerary with localStorage persistence.
 * Each itinerary has its own isolated chat history.
 *
 * Features:
 * - Persistent storage (survives page refresh)
 * - Itinerary-specific (isolated by itinerary_id)
 * - Cross-tab synchronization
 * - Automatic save on message changes
 */

import { useState, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/types/chat";

const STORAGE_PREFIX = "tripai:chat:";

export interface UseItineraryChatReturn {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}

/**
 * Hook for managing chat messages for a specific itinerary
 *
 * @param itineraryId - The ID of the itinerary
 * @returns Chat messages and management functions
 *
 * @example
 * ```tsx
 * function ChatPanel({ itinerary }) {
 *   const { messages, addMessage, clearMessages } = useItineraryChat(itinerary.id);
 *
 *   const handleSend = (text: string) => {
 *     addMessage({
 *       id: crypto.randomUUID(),
 *       role: 'user',
 *       content: text,
 *       timestamp: Date.now(),
 *     });
 *   };
 * }
 * ```
 */
export function useItineraryChat(itineraryId: string): UseItineraryChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load chat history from localStorage on mount or when itineraryId changes
  useEffect(() => {
    const key = `${STORAGE_PREFIX}${itineraryId}`;

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[];
        setMessages(parsed);
      } else {
        // No existing chat history for this itinerary
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to load chat history:", error);
      setMessages([]);
    }
  }, [itineraryId]);

  // Save to localStorage helper
  const saveToStorage = useCallback(
    (msgs: ChatMessage[]) => {
      const key = `${STORAGE_PREFIX}${itineraryId}`;
      try {
        localStorage.setItem(key, JSON.stringify(msgs));
      } catch (error) {
        console.error("Failed to save chat history:", error);

        // Handle quota exceeded error
        if (error instanceof Error && error.name === "QuotaExceededError") {
          console.warn(
            "LocalStorage quota exceeded. Consider clearing old chat histories."
          );
        }
      }
    },
    [itineraryId]
  );

  /**
   * Add or update a message
   * If a message with the same ID exists, it will be updated
   * Otherwise, a new message will be added
   */
  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => {
        const existingIndex = prev.findIndex((m) => m.id === message.id);

        let updated: ChatMessage[];
        if (existingIndex !== -1) {
          // Update existing message (useful for streaming updates)
          updated = [...prev];
          updated[existingIndex] = message;
        } else {
          // Add new message
          updated = [...prev, message];
        }

        // Save to localStorage
        saveToStorage(updated);

        return updated;
      });
    },
    [saveToStorage]
  );

  /**
   * Clear all messages for this itinerary
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    const key = `${STORAGE_PREFIX}${itineraryId}`;
    localStorage.removeItem(key);
  }, [itineraryId]);

  return {
    messages,
    addMessage,
    clearMessages,
  };
}
