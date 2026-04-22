// components/planner/itinerary/hooks/use-yjs-sync.ts
import { useEffect, useRef } from "react";
import * as Y from "yjs";
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

  // ── 1. Broadcast local changes to Y.Doc ────────────────────────────
  useEffect(() => {
    if (!session || !itinerary) return;

    const serialized = JSON.stringify(itinerary);

    // Skip if this is the same state we just broadcast or just received
    if (lastBroadcastRef.current === serialized) return;

    // On first availability (session + itinerary both ready), this is the
    // initial DB load from Supabase. Record it without broadcasting — the DB
    // is the source of truth for initial state.
    if (lastBroadcastRef.current === null) {
      lastBroadcastRef.current = serialized;
      return;
    }
    const yItinerary = session.doc.getMap("itinerary");

    session.doc.transact(() => {
      yItinerary.set("data", itinerary);
    });

    lastBroadcastRef.current = serialized;
  }, [session, itinerary]);

  // ── 2. Listen for remote changes from Y.Doc ────────────────────────
  useEffect(() => {
    if (!session) return;

    const yItinerary = session.doc.getMap("itinerary");

    const handleRemoteChange = (_event: Y.YMapEvent<unknown>, transaction: Y.Transaction) => {
      // Skip changes that originated from this client (our own broadcasts)
      if (transaction.local) return;

      const remoteData = yItinerary.get("data") as Itinerary | undefined;
      if (!remoteData) return;

      lastBroadcastRef.current = JSON.stringify(remoteData);

      onRemoteUpdate(remoteData);
    };

    yItinerary.observe(handleRemoteChange);

    return () => {
      yItinerary.unobserve(handleRemoteChange);
    };
  }, [session, onRemoteUpdate]);
}
