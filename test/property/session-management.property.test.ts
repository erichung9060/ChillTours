/**
 * Property-Based Tests for Session Management (Chat History)
 * 
 * Feature: tripai-travel-planner
 * Property 20: Session Initialization
 * Property 21: Chat History Non-Persistence
 * 
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { SessionProvider } from '@/lib/session';
import { useSession } from '@/hooks/use-session';
import type { ChatMessage } from '@/types/chat';
import type { Itinerary } from '@/types/itinerary';

// Test data arbitraries
const chatMessageArbitrary = fc.record({
  id: fc.uuid(),
  role: fc.constantFrom('user' as const, 'assistant' as const),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
});

const itineraryArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  destination: fc.string({ minLength: 1, maxLength: 100 }),
  start_date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map(ts => new Date(ts).toISOString().split('T')[0]),
  end_date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map(ts => new Date(ts).toISOString().split('T')[0]),
  days: fc.array(fc.record({
    day_number: fc.integer({ min: 1, max: 14 }),
    date: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map(ts => new Date(ts).toISOString().split('T')[0]),
    activities: fc.array(fc.record({
      id: fc.uuid(),
      time: fc.string({ minLength: 5, maxLength: 5 }),
      title: fc.string({ minLength: 1, maxLength: 100 }),
      description: fc.string({ minLength: 0, maxLength: 500 }),
      location: fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        address: fc.string({ minLength: 1, maxLength: 200 }),
        lat: fc.double({ min: -90, max: 90 }),
        lng: fc.double({ min: -180, max: 180 }),
      }),
      duration_minutes: fc.integer({ min: 15, max: 480 }),
      order: fc.integer({ min: 0, max: 100 }),
    }), { maxLength: 10 }),
  }), { minLength: 1, maxLength: 14 }),
  created_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
  updated_at: fc.integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-12-31').getTime() }).map(ts => new Date(ts).toISOString()),
  shared_with: fc.array(fc.uuid(), { maxLength: 5 }),
});

describe('Property 20: Session Initialization', () => {
  beforeEach(() => {
    // Clear any storage before each test
    localStorage.clear();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  // Feature: tripai-travel-planner, Property 20: Session Initialization
  it('should create a fresh session with empty conversation history on initialization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (numInitializations) => {
          const sessionIds: string[] = [];

          // Initialize multiple sessions
          for (let i = 0; i < numInitializations; i++) {
            const { result, unmount } = renderHook(() => useSession(), {
              wrapper: SessionProvider,
            });

            // Verify fresh session
            expect(result.current.session.chat_history).toEqual([]);
            expect(result.current.session.current_itinerary).toBeNull();
            expect(result.current.session.session_id).toBeDefined();
            expect(result.current.session.session_id).toMatch(/^session_\d+_[a-z0-9]+$/);
            expect(result.current.session.created_at).toBeGreaterThan(0);

            sessionIds.push(result.current.session.session_id);
            unmount();
          }

          // Verify each session had a unique ID
          const uniqueIds = new Set(sessionIds);
          expect(uniqueIds.size).toBe(numInitializations);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 20: Session Initialization
  it('should store conversation history in memory only during active session', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 20 }),
        async (messages) => {
          const { result } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          // Add messages to session
          act(() => {
            messages.forEach(msg => {
              result.current.addMessage(msg);
            });
          });

          // Verify messages are in memory
          const history = result.current.getChatHistory();
          expect(history).toHaveLength(messages.length);
          expect(history).toEqual(messages);

          // Verify NOT persisted to localStorage
          expect(localStorage.getItem('tripai:session')).toBeNull();
          expect(localStorage.getItem('tripai:chat_history')).toBeNull();

          // Verify NOT persisted to sessionStorage
          if (typeof sessionStorage !== 'undefined') {
            expect(sessionStorage.getItem('tripai:session')).toBeNull();
            expect(sessionStorage.getItem('tripai:chat_history')).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 20: Session Initialization
  it('should clear session on page refresh (new initialization)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 10 }),
        itineraryArbitrary,
        async (messages, itinerary) => {
          // First session
          const { result: result1, unmount: unmount1 } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          const firstSessionId = result1.current.session.session_id;

          // Add data to first session
          act(() => {
            messages.forEach(msg => result1.current.addMessage(msg));
            result1.current.setCurrentItinerary(itinerary);
          });

          // Verify data exists
          expect(result1.current.getChatHistory()).toHaveLength(messages.length);
          expect(result1.current.session.current_itinerary).toEqual(itinerary);

          // Unmount (simulate page close)
          unmount1();

          // Second session (simulate page refresh)
          const { result: result2 } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          const secondSessionId = result2.current.session.session_id;

          // Verify new session is fresh
          expect(secondSessionId).not.toBe(firstSessionId);
          expect(result2.current.getChatHistory()).toEqual([]);
          expect(result2.current.session.current_itinerary).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 21: Chat History Non-Persistence', () => {
  beforeEach(() => {
    // Clear storage and set up spies
    localStorage.clear();
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
    vi.spyOn(Storage.prototype, 'setItem');
    vi.spyOn(Storage.prototype, 'getItem');
  });

  // Feature: tripai-travel-planner, Property 21: Chat History Non-Persistence
  it('should never persist chat history to localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 50 }),
        async (messages) => {
          const { result } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          // Add many messages
          act(() => {
            messages.forEach(msg => result.current.addMessage(msg));
          });

          // Verify messages are in memory
          expect(result.current.getChatHistory()).toHaveLength(messages.length);

          // Verify localStorage was never called with chat-related keys
          const setItemCalls = vi.mocked(localStorage.setItem).mock.calls;
          const chatRelatedCalls = setItemCalls.filter(([key]) => 
            key.includes('chat') || 
            key.includes('message') || 
            key.includes('history') ||
            key.includes('session')
          );

          expect(chatRelatedCalls).toHaveLength(0);

          // Verify no chat data in localStorage
          const allKeys = Object.keys(localStorage);
          const chatKeys = allKeys.filter(key => 
            key.includes('chat') || 
            key.includes('message') || 
            key.includes('history')
          );

          expect(chatKeys).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 21: Chat History Non-Persistence
  it('should never persist chat history to sessionStorage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 50 }),
        async (messages) => {
          if (typeof sessionStorage === 'undefined') {
            return; // Skip if sessionStorage not available
          }

          const { result } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          // Add messages
          act(() => {
            messages.forEach(msg => result.current.addMessage(msg));
          });

          // Verify sessionStorage was never called with chat-related keys
          const setItemCalls = vi.mocked(sessionStorage.setItem).mock.calls;
          const chatRelatedCalls = setItemCalls.filter(([key]) => 
            key.includes('chat') || 
            key.includes('message') || 
            key.includes('history')
          );

          expect(chatRelatedCalls).toHaveLength(0);

          // Verify no chat data in sessionStorage
          const allKeys = Object.keys(sessionStorage);
          const chatKeys = allKeys.filter(key => 
            key.includes('chat') || 
            key.includes('message') || 
            key.includes('history')
          );

          expect(chatKeys).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 21: Chat History Non-Persistence
  it('should lose all chat history when browser closes (session ends)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 20 }),
        async (messages) => {
          // First session (before browser close)
          const { result: result1, unmount: unmount1 } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          // Add messages
          act(() => {
            messages.forEach(msg => result1.current.addMessage(msg));
          });

          // Verify messages exist
          expect(result1.current.getChatHistory()).toHaveLength(messages.length);

          // Simulate browser close (unmount and clear memory)
          unmount1();

          // Verify no persistence
          expect(localStorage.getItem('tripai:chat_history')).toBeNull();
          if (typeof sessionStorage !== 'undefined') {
            expect(sessionStorage.getItem('tripai:chat_history')).toBeNull();
          }

          // New session (after browser reopen)
          const { result: result2 } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          // Verify chat history is gone
          expect(result2.current.getChatHistory()).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 21: Chat History Non-Persistence
  it('should never write chat history to any database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 30 }),
        async (messages) => {
          // Mock fetch to detect any database writes
          const fetchSpy = vi.spyOn(global, 'fetch');

          const { result } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          // Add messages
          act(() => {
            messages.forEach(msg => result.current.addMessage(msg));
          });

          // Clear messages
          act(() => {
            result.current.clearChatHistory();
          });

          // Add more messages
          act(() => {
            messages.slice(0, 5).forEach(msg => result.current.addMessage(msg));
          });

          // Verify no fetch calls were made (no database writes)
          expect(fetchSpy).not.toHaveBeenCalled();

          fetchSpy.mockRestore();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 21: Chat History Non-Persistence
  it('should maintain chat history only in React state (memory)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(chatMessageArbitrary, { minLength: 1, maxLength: 15 }),
        async (messages) => {
          const { result } = renderHook(() => useSession(), {
            wrapper: SessionProvider,
          });

          // Add messages one by one
          for (const msg of messages) {
            act(() => {
              result.current.addMessage(msg);
            });

            // After each addition, verify it's only in memory
            const history = result.current.getChatHistory();
            expect(history.length).toBeGreaterThan(0);

            // Verify no persistence
            expect(localStorage.length).toBe(0);
            if (typeof sessionStorage !== 'undefined') {
              expect(sessionStorage.length).toBe(0);
            }
          }

          // Final verification
          expect(result.current.getChatHistory()).toHaveLength(messages.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
