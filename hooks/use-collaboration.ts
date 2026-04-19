// hooks/use-collaboration.ts
import { useEffect, useRef, useState } from "react";
import { createCollaborationSession, destroyCollaborationSession } from "@/lib/collaboration/provider";
import type { CollaborationSession } from "@/types/collaboration";
import { getAccessToken } from "@/lib/supabase/client";

interface UseCollaborationReturn {
  session: CollaborationSession | null;
  connected: boolean;
}

/**
 * Manages the lifecycle of a Yjs collaboration session.
 * Connects when mounted, disconnects when unmounted or itineraryId changes.
 */
export function useCollaboration(itineraryId: string | null): UseCollaborationReturn {
  const sessionRef = useRef<CollaborationSession | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let session: CollaborationSession | null = null;

    async function connect() {
      const token = await getAccessToken();
      if (!token || !itineraryId) return;

      session = createCollaborationSession(itineraryId, token);
      sessionRef.current = session;

      session.provider.on("status", (event: { status: string }) => {
        setConnected(event.status === "connected");
      });
    }

    connect();

    return () => {
      if (session) {
        destroyCollaborationSession(session);
        sessionRef.current = null;
        setConnected(false);
      }
    };
  }, [itineraryId]);

  return { session: sessionRef.current, connected };
}
