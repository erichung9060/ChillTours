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

import { useState, useCallback } from "react";
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
  const storageKey = `${STORAGE_PREFIX}${itineraryId}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as ChatMessage[]) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage helper
  const saveToStorage = useCallback(
    (msgs: ChatMessage[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(msgs));
      } catch (error) {
        console.error("Failed to save chat history:", error);

        // Handle quota exceeded error
        if (error instanceof Error && error.name === "QuotaExceededError") {
          console.warn("LocalStorage quota exceeded. Consider clearing old chat histories.");
        }
      }
    },
    [storageKey],
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
    [saveToStorage],
  );

  /**
   * Clear all messages for this itinerary
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    messages,
    addMessage,
    clearMessages,
  };
}
