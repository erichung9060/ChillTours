import { vi } from "vitest";

/**
 * Test utility functions and helpers
 */

/**
 * Creates a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  };
}

/**
 * Creates a mock itinerary for testing
 */
export function createMockItinerary() {
  return {
    id: "test-id",
    user_id: "test-user",
    title: "Test Trip",
    destination: "Test Destination",
    start_date: "2025-01-01",
    end_date: "2025-01-05",
    days: [
      {
        day_number: 1,
        date: "2025-01-01",
        activities: [
          {
            id: "activity-1",
            time: "09:00",
            title: "Test Activity",
            description: "Test Description",
            location: {
              name: "Test Location",
              lat: 0,
              lng: 0,
            },
            duration_minutes: 60,
            order: 0,
          },
        ],
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Delays execution for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
