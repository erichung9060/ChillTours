// components/planner/itinerary/hooks/use-yjs-sync.ts
import { useEffect, useRef } from "react";
import type { Itinerary } from "@/types/itinerary";
import type { CollaborationSession } from "@/types/collaboration";

/**
 * Syncs Zustand store with Yjs Y.Doc for real-time collaboration.
 *
 * Architecture:
 * - Zustand + Supabase remain the primary data source
 * - Yjs acts as a broadcast channel for real-time updates
 * - Local changes: commitItineraryChange saves to DB, then broadcasts to Y.Doc
 * - Remote changes: Y.Doc updates trigger Zustand store updates (no DB write)
 */
export function useYjsSync(
  session: CollaborationSession | null,
  itinerary: Itinerary | null,
  onRemoteUpdate: (itinerary: Itinerary) => void,
) {
  const lastBroadcastRef = useRef<string | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const itineraryRef = useRef<Itinerary | null>(null);

  useEffect(() => {
    itineraryRef.current = itinerary;
  }, [itinerary]);

  // ── 1. Broadcast local changes to Y.Doc ────────────────────────────
  useEffect(() => {
    if (!session || !itinerary) return;

    const serialized = JSON.stringify(itinerary);

    // Skip if this is the same state we just broadcast
    if (lastBroadcastRef.current === serialized) return;

    // Skip if we're currently applying a remote update
    if (isApplyingRemoteRef.current) return;

    const yItinerary = session.doc.getMap("itinerary");

    session.doc.transact(() => {
      yItinerary.set("data", itinerary);
      yItinerary.set("updated_at", itinerary.updated_at);
    });

    lastBroadcastRef.current = serialized;
  }, [session, itinerary]);

  // ── 2. Listen for remote changes from Y.Doc ────────────────────────
  useEffect(() => {
    if (!session) return;

    const yItinerary = session.doc.getMap("itinerary");

    const handleRemoteChange = () => {
      // Skip if this change came from us
      if (isApplyingRemoteRef.current) return;

      const remoteData = yItinerary.get("data") as Itinerary | undefined;
      const remoteUpdatedAt = yItinerary.get("updated_at") as string | undefined;

      if (!remoteData || !remoteUpdatedAt) return;

      // Only apply if remote is newer
      const currentItinerary = itineraryRef.current;
      if (currentItinerary && remoteUpdatedAt <= currentItinerary.updated_at) return;

      // Mark that we're applying a remote update to prevent echo
      isApplyingRemoteRef.current = true;
      lastBroadcastRef.current = JSON.stringify(remoteData);

      onRemoteUpdate(remoteData);

      // Reset flag after a tick to allow next local broadcast
      setTimeout(() => {
        isApplyingRemoteRef.current = false;
      }, 0);
    };

    yItinerary.observe(handleRemoteChange);

    return () => {
      yItinerary.unobserve(handleRemoteChange);
    };
  }, [session, onRemoteUpdate]);
}
