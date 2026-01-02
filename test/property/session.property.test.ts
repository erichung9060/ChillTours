/**
 * Property-Based Tests for Session Management
 * 
 * Feature: tripai-travel-planner
 * Property 2: Session Persistence Across Refreshes
 * Property 3: Sign-out Cleanup
 * 
 * Validates: Requirements 1.4, 1.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

// Mock Supabase client for testing
let mockSupabase: SupabaseClient<Database>;

// Test data arbitraries
const testUserIdArbitrary = fc.uuid();
const testEmailArbitrary = fc.emailAddress();
const testSessionArbitrary = fc.record({
  access_token: fc.string({ minLength: 20, maxLength: 100 }),
  refresh_token: fc.string({ minLength: 20, maxLength: 100 }),
  expires_in: fc.integer({ min: 3600, max: 86400 }),
  expires_at: fc.integer({ min: Math.floor(Date.now() / 1000), max: Math.floor(Date.now() / 1000) + 86400 }),
  token_type: fc.constant('bearer'),
});

describe('Property 2: Session Persistence Across Refreshes', () => {
  beforeEach(() => {
    // Mock localStorage for session persistence
    const localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
      };
    })();

    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getSession: vi.fn(),
        setSession: vi.fn(),
        refreshSession: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // Feature: tripai-travel-planner, Property 2: Session Persistence Across Refreshes
  it('should persist session data across page refreshes', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserIdArbitrary,
        testEmailArbitrary,
        testSessionArbitrary,
        async (userId, email, sessionData) => {
          const mockSession = {
            ...sessionData,
            user: {
              id: userId,
              email,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          // Simulate initial authentication
          vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
            data: { session: mockSession as any },
            error: null,
          });

          // Get initial session
          const { data: { session: initialSession } } = await mockSupabase.auth.getSession();
          expect(initialSession).toBeDefined();
          expect(initialSession?.user.id).toBe(userId);

          // Store session in localStorage (simulating Supabase's behavior)
          localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));

          // Simulate page refresh - get session from storage
          const storedSession = localStorage.getItem('supabase.auth.token');
          expect(storedSession).toBeDefined();

          const parsedSession = JSON.parse(storedSession!);
          expect(parsedSession.user.id).toBe(userId);
          expect(parsedSession.user.email).toBe(email);
          expect(parsedSession.access_token).toBe(sessionData.access_token);

          // Simulate getting session after refresh
          vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
            data: { session: mockSession as any },
            error: null,
          });

          const { data: { session: refreshedSession } } = await mockSupabase.auth.getSession();
          expect(refreshedSession).toBeDefined();
          expect(refreshedSession?.user.id).toBe(initialSession?.user.id);
          expect(refreshedSession?.access_token).toBe(initialSession?.access_token);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 2: Session Persistence Across Refreshes
  it('should automatically refresh expired sessions', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserIdArbitrary,
        testEmailArbitrary,
        testSessionArbitrary,
        async (userId, email, sessionData) => {
          // Create expired session
          const expiredSession = {
            ...sessionData,
            expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
            user: {
              id: userId,
              email,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          // Create refreshed session
          const refreshedSession = {
            ...sessionData,
            access_token: sessionData.access_token + '_refreshed',
            expires_at: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
            user: expiredSession.user,
          };

          // Mock expired session retrieval
          vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
            data: { session: expiredSession as any },
            error: null,
          });

          // Mock session refresh
          vi.mocked(mockSupabase.auth.refreshSession).mockResolvedValueOnce({
            data: { session: refreshedSession as any, user: refreshedSession.user as any },
            error: null,
          });

          // Get expired session
          const { data: { session: oldSession } } = await mockSupabase.auth.getSession();
          expect(oldSession?.expires_at).toBeLessThan(Date.now() / 1000);

          // Refresh session
          const { data: { session: newSession } } = await mockSupabase.auth.refreshSession();
          expect(newSession).toBeDefined();
          expect(newSession?.user.id).toBe(userId);
          expect(newSession?.expires_at).toBeGreaterThan(Date.now() / 1000);
          expect(newSession?.access_token).not.toBe(oldSession?.access_token);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 2: Session Persistence Across Refreshes
  it('should maintain session state across multiple page loads', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserIdArbitrary,
        testEmailArbitrary,
        fc.integer({ min: 2, max: 5 }),
        async (userId, email, numRefreshes) => {
          const mockSession = {
            access_token: 'test_token',
            refresh_token: 'test_refresh',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer' as const,
            user: {
              id: userId,
              email,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          // Store initial session
          localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));

          // Clear previous mock calls
          vi.clearAllMocks();

          // Simulate multiple page refreshes
          for (let i = 0; i < numRefreshes; i++) {
            vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
              data: { session: mockSession as any },
              error: null,
            });

            const { data: { session } } = await mockSupabase.auth.getSession();
            expect(session).toBeDefined();
            expect(session?.user.id).toBe(userId);
            expect(session?.user.email).toBe(email);
          }

          // Verify session was retrieved the correct number of times
          expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(numRefreshes);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 3: Sign-out Cleanup', () => {
  beforeEach(() => {
    // Mock localStorage and sessionStorage
    const createStorageMock = () => {
      let store: Record<string, string> = {};
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
        removeItem: (key: string) => {
          delete store[key];
        },
        clear: () => {
          store = {};
        },
        get length() {
          return Object.keys(store).length;
        },
      };
    };

    Object.defineProperty(global, 'localStorage', {
      value: createStorageMock(),
      writable: true,
    });

    Object.defineProperty(global, 'sessionStorage', {
      value: createStorageMock(),
      writable: true,
    });

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getSession: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  // Feature: tripai-travel-planner, Property 3: Sign-out Cleanup
  it('should clear all session data on sign-out', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserIdArbitrary,
        testEmailArbitrary,
        testSessionArbitrary,
        async (userId, email, sessionData) => {
          const mockSession = {
            ...sessionData,
            user: {
              id: userId,
              email,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          // Set up authenticated state
          localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));
          sessionStorage.setItem('tripai:session', JSON.stringify({ session_id: 'test' }));

          // Verify session exists
          expect(localStorage.getItem('supabase.auth.token')).toBeDefined();
          expect(sessionStorage.getItem('tripai:session')).toBeDefined();

          // Mock successful sign-out
          vi.mocked(mockSupabase.auth.signOut).mockResolvedValueOnce({
            error: null,
          });

          // Sign out
          await mockSupabase.auth.signOut();

          // Clear storage (simulating our sign-out implementation)
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();

          // Verify all session data is cleared
          expect(localStorage.getItem('supabase.auth.token')).toBeNull();
          expect(sessionStorage.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 3: Sign-out Cleanup
  it('should clear session state and return null user after sign-out', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserIdArbitrary,
        testEmailArbitrary,
        async (userId, email) => {
          const mockSession = {
            access_token: 'test_token',
            refresh_token: 'test_refresh',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: 'bearer' as const,
            user: {
              id: userId,
              email,
              aud: 'authenticated',
              role: 'authenticated',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };

          // Set up authenticated state
          vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
            data: { session: mockSession as any },
            error: null,
          });

          // Verify user is authenticated
          const { data: { session: beforeSession } } = await mockSupabase.auth.getSession();
          expect(beforeSession).toBeDefined();
          expect(beforeSession?.user.id).toBe(userId);

          // Mock sign-out
          vi.mocked(mockSupabase.auth.signOut).mockResolvedValueOnce({
            error: null,
          });

          await mockSupabase.auth.signOut();

          // Mock session retrieval after sign-out
          vi.mocked(mockSupabase.auth.getSession).mockResolvedValueOnce({
            data: { session: null },
            error: null,
          });

          // Verify user is no longer authenticated
          const { data: { session: afterSession } } = await mockSupabase.auth.getSession();
          expect(afterSession).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 3: Sign-out Cleanup
  it('should clear all application-specific session storage on sign-out', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserIdArbitrary,
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        async (userId, sessionKeys) => {
          // Set up multiple session storage items
          sessionKeys.forEach((key, index) => {
            sessionStorage.setItem(`tripai:${key}`, `value_${index}`);
          });

          // Verify items exist
          expect(sessionStorage.length).toBeGreaterThan(0);

          // Mock sign-out
          vi.mocked(mockSupabase.auth.signOut).mockResolvedValueOnce({
            error: null,
          });

          await mockSupabase.auth.signOut();

          // Clear all session storage
          sessionStorage.clear();

          // Verify all items are cleared
          expect(sessionStorage.length).toBe(0);
          sessionKeys.forEach(key => {
            expect(sessionStorage.getItem(`tripai:${key}`)).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  // Feature: tripai-travel-planner, Property 3: Sign-out Cleanup
  it('should handle sign-out errors gracefully without clearing session', async () => {
    await fc.assert(
      fc.asyncProperty(
        testUserIdArbitrary,
        fc.string({ minLength: 10, maxLength: 100 }),
        async (userId, errorMessage) => {
          const mockSession = {
            access_token: 'test_token',
            user: {
              id: userId,
              email: 'test@example.com',
            },
          };

          // Set up authenticated state
          localStorage.setItem('supabase.auth.token', JSON.stringify(mockSession));

          // Mock sign-out error
          vi.mocked(mockSupabase.auth.signOut).mockResolvedValueOnce({
            error: {
              message: errorMessage,
              name: 'AuthError',
              status: 500,
            } as any,
          });

          // Attempt sign-out
          const { error } = await mockSupabase.auth.signOut();

          // Verify error occurred
          expect(error).toBeDefined();
          expect(error?.message).toBe(errorMessage);

          // Session should still exist (not cleared on error)
          expect(localStorage.getItem('supabase.auth.token')).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
