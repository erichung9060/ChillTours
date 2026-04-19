// hooks/use-collaboration.ts
import { useEffect, useState } from "react";
import {
  createCollaborationSession,
  destroyCollaborationSession,
} from "@/lib/collaboration/provider";
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
  const [session, setSession] = useState<CollaborationSession | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!itineraryId) return;

    let currentSession: CollaborationSession | null = null;

    async function connect() {
      const token = await getAccessToken();
      if (!token || !itineraryId) return;

      currentSession = createCollaborationSession(itineraryId, token);
      setSession(currentSession);

      currentSession.provider.on("status", (event: { status: string }) => {
        setConnected(event.status === "connected");
      });
    }

    connect();

    return () => {
      if (currentSession) {
        destroyCollaborationSession(currentSession);
        setSession(null);
        setConnected(false);
      }
    };
  }, [itineraryId]);

  return { session, connected };
}
