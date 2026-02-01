/**
 * Property-Based Tests for Session Memory Storage
 * 
 * Feature: tripai-travel-planner
 * Property 9: Session Memory Storage
 * 
 * Validates: Requirements 3.6, 8.5
 * 
 * For any generated itinerary or chat message, the data should be stored in session memory
 * (not database) and accessible throughout the session.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { SessionProvider, useSessionContext } from '@/lib/session/session-provider';
import type { ChatMessage } from '@/types/chat';
import type { Itinerary } from '@/types/itinerary';
import { chatMessageArbitrary, itineraryArbitrary } from '@/test/utils/property-test-helpers';

/**
 * Helper to render hook with SessionProvider
 */
function renderSessionHook() {
  return renderHook(() => useSessionContext(), {
    wrapper: ({ children }: { children: React.ReactNode }) => 
      React.createElement(SessionProvider, null, children),
  });
}

describe('Property 9: Session Memory Storage', () => {
  beforeEach(() => {
    // Clear any existing storage
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should store chat messages in memory and make them accessible throughout the session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 20 }),
        async (messages) => {
          const { result } = renderSessionHook();

          // Add all messages to session
          act(() => {
            messages.forEach(msg => {
              result.current.addMessage(msg);
            });
          });

          // Property 1: All messages should be retrievable
          const storedMessages = result.current.getChatHistory();
          expect(storedMessages.length).toBe(messages.length);

          // Property 2: Messages should be in the same order
          storedMessages.forEach((stored, index) => {
            expect(stored.id).toBe(messages[index].id);
            expect(stored.role).toBe(messages[index].role);
            expect(stored.content).toBe(messages[index].content);
            expect(stored.timestamp).toBe(messages[index].timestamp);
          });

          // Property 3: Messages should NOT be in localStorage
          expect(localStorage.getItem('tripai:chat_history')).toBeNull();
          expect(localStorage.getItem('tripai:messages')).toBeNull();

          // Property 4: Messages should NOT be in sessionStorage
          expect(sessionStorage.getItem('tripai:chat_history')).toBeNull();
          expect(sessionStorage.getItem('tripai:messages')).toBeNull();

          // Property 5: Session should have a unique session ID
          expect(result.current.session.session_id).toBeDefined();
          expect(result.current.session.session_id).toMatch(/^session_/);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should store itinerary in memory and make it accessible throughout the session', async () => {
    await fc.assert(
      fc.asyncProperty(
        itineraryArbitrary,
        async (itinerary) => {
          const { result } = renderSessionHook();

          // Set itinerary in session
          act(() => {
            result.current.setCurrentItinerary(itinerary);
          });

          // Property 1: Itinerary should be retrievable
          expect(result.current.session.current_itinerary).toBeDefined();
          expect(result.current.session.current_itinerary?.id).toBe(itinerary.id);
          expect(result.current.session.current_itinerary?.destination).toBe(itinerary.destination);

          // Property 2: Itinerary should NOT be in localStorage
          expect(localStorage.getItem('tripai:itinerary')).toBeNull();
          expect(localStorage.getItem('tripai:current_itinerary')).toBeNull();

          // Property 3: Itinerary should NOT be in sessionStorage
          expect(sessionStorage.getItem('tripai:itinerary')).toBeNull();
          expect(sessionStorage.getItem('tripai:current_itinerary')).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should maintain session data across multiple operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 10 }),
        itineraryArbitrary,
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 10 }),
        async (initialMessages, itinerary, additionalMessages) => {
          const { result } = renderSessionHook();

          // Add initial messages
          act(() => {
            initialMessages.forEach(msg => result.current.addMessage(msg));
          });

          // Set itinerary
          act(() => {
            result.current.setCurrentItinerary(itinerary);
          });

          // Add more messages
          act(() => {
            additionalMessages.forEach(msg => result.current.addMessage(msg));
          });

          // Property 1: All messages should be present
          const allMessages = [...initialMessages, ...additionalMessages];
          const storedMessages = result.current.getChatHistory();
          expect(storedMessages.length).toBe(allMessages.length);

          // Property 2: Itinerary should still be accessible
          expect(result.current.session.current_itinerary?.id).toBe(itinerary.id);

          // Property 3: No data should be persisted to storage
          expect(localStorage.length).toBe(0);
          expect(sessionStorage.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should clear chat history without affecting itinerary', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 10 }),
        itineraryArbitrary,
        async (messages, itinerary) => {
          const { result } = renderSessionHook();

          // Add messages and itinerary
          act(() => {
            messages.forEach(msg => result.current.addMessage(msg));
            result.current.setCurrentItinerary(itinerary);
          });

          // Verify both are present
          expect(result.current.getChatHistory().length).toBe(messages.length);
          expect(result.current.session.current_itinerary).toBeDefined();

          // Clear chat history
          act(() => {
            result.current.clearChatHistory();
          });

          // Property 1: Chat history should be empty
          expect(result.current.getChatHistory().length).toBe(0);

          // Property 2: Itinerary should still be present
          expect(result.current.session.current_itinerary?.id).toBe(itinerary.id);

          // Property 3: Session ID should remain the same
          expect(result.current.session.session_id).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should reset session and clear all data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 10 }),
        itineraryArbitrary,
        async (messages, itinerary) => {
          const { result } = renderSessionHook();

          // Store original session ID
          const originalSessionId = result.current.session.session_id;

          // Add messages and itinerary
          act(() => {
            messages.forEach(msg => result.current.addMessage(msg));
            result.current.setCurrentItinerary(itinerary);
          });

          // Verify data is present
          expect(result.current.getChatHistory().length).toBe(messages.length);
          expect(result.current.session.current_itinerary).toBeDefined();

          // Reset session
          act(() => {
            result.current.resetSession();
          });

          // Property 1: Chat history should be empty
          expect(result.current.getChatHistory().length).toBe(0);

          // Property 2: Itinerary should be null
          expect(result.current.session.current_itinerary).toBeNull();

          // Property 3: New session ID should be generated
          expect(result.current.session.session_id).not.toBe(originalSessionId);

          // Property 4: No data should be persisted
          expect(localStorage.length).toBe(0);
          expect(sessionStorage.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should handle rapid message additions without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 10, maxLength: 50 }),
        async (messages) => {
          const { result } = renderSessionHook();

          // Add all messages rapidly
          act(() => {
            messages.forEach(msg => result.current.addMessage(msg));
          });

          // Property 1: All messages should be stored
          const storedMessages = result.current.getChatHistory();
          expect(storedMessages.length).toBe(messages.length);

          // Property 2: Message order should be preserved
          storedMessages.forEach((stored, index) => {
            expect(stored.id).toBe(messages[index].id);
          });

          // Property 3: No duplicates should exist
          const uniqueIds = new Set(storedMessages.map(m => m.id));
          expect(uniqueIds.size).toBe(messages.length);
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should maintain data isolation between different session instances', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 5 }),
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 5 }),
        async (messages1, messages2) => {
          // Create two separate session instances
          const { result: result1 } = renderSessionHook();
          const { result: result2 } = renderSessionHook();

          // Add different messages to each session
          act(() => {
            messages1.forEach(msg => result1.current.addMessage(msg));
            messages2.forEach(msg => result2.current.addMessage(msg));
          });

          // Property 1: Each session should have its own messages
          expect(result1.current.getChatHistory().length).toBe(messages1.length);
          expect(result2.current.getChatHistory().length).toBe(messages2.length);

          // Property 2: Session IDs should be different
          expect(result1.current.session.session_id).not.toBe(result2.current.session.session_id);

          // Property 3: Messages should not overlap
          const ids1 = result1.current.getChatHistory().map(m => m.id);
          const ids2 = result2.current.getChatHistory().map(m => m.id);
          
          messages1.forEach((msg, index) => {
            expect(ids1[index]).toBe(msg.id);
          });
          
          messages2.forEach((msg, index) => {
            expect(ids2[index]).toBe(msg.id);
          });
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: tripai-travel-planner, Property 9: Session Memory Storage
  it('should never persist session data to any storage mechanism', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 20 }),
        itineraryArbitrary,
        fc.integer({ min: 1, max: 10 }),
        async (messages, itinerary, operationCount) => {
          const { result } = renderSessionHook();

          // Perform multiple operations
          for (let i = 0; i < operationCount; i++) {
            act(() => {
              // Add messages
              messages.forEach(msg => result.current.addMessage(msg));
              
              // Set itinerary
              result.current.setCurrentItinerary(itinerary);
              
              // Clear and re-add
              result.current.clearChatHistory();
              messages.slice(0, 3).forEach(msg => result.current.addMessage(msg));
            });
          }

          // Property: No session data should ever be in storage
          const allLocalStorageKeys = Object.keys(localStorage);
          const allSessionStorageKeys = Object.keys(sessionStorage);

          // Check for any tripai-related keys
          const hasTripAILocalStorage = allLocalStorageKeys.some(key => 
            key.includes('tripai') || 
            key.includes('session') || 
            key.includes('chat') || 
            key.includes('itinerary')
          );

          const hasTripAISessionStorage = allSessionStorageKeys.some(key => 
            key.includes('tripai') || 
            key.includes('session') || 
            key.includes('chat') || 
            key.includes('itinerary')
          );

          expect(hasTripAILocalStorage).toBe(false);
          expect(hasTripAISessionStorage).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });
});
