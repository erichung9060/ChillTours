/**
 * useItineraries Hook
 *
 * Custom hook for managing itinerary data fetching, loading states, and error handling.
 * Provides a simple interface for components to access user's itineraries.
 *
 * Requirements: 2.1, 2.2, 2.5, 5.1, 5.2
 */

import { useState, useEffect, useCallback } from "react";
import {
  listUserItineraries,
  type ItinerarySummary,
} from "@/lib/supabase/itineraries";

export interface UseItinerariesReturn {
  itineraries: ItinerarySummary[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and managing user's itineraries
 *
 * @returns Object containing itineraries data, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { itineraries, loading, error, refetch } = useItineraries();
 *
 *   if (loading) return <Loading />;
 *   if (error) return <ErrorMessage onRetry={refetch} />;
 *   return <ItineraryList itineraries={itineraries} />;
 * }
 * ```
 */
export function useItineraries(): UseItinerariesReturn {
  const [itineraries, setItineraries] = useState<ItinerarySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchItineraries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await listUserItineraries();
      setItineraries(data);
    } catch (err) {
      console.error("Failed to fetch itineraries:", err);
      setError(
        err instanceof Error
          ? err
          : new Error("An unknown error occurred while fetching itineraries")
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchItineraries();
  }, [fetchItineraries]);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  return {
    itineraries,
    loading,
    error,
    refetch,
  };
}
