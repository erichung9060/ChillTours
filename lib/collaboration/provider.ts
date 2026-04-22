// lib/collaboration/provider.ts
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { CollaborationSession } from "@/types/collaboration";

const WS_SERVER_URL = process.env.NEXT_PUBLIC_YJS_SERVER_URL;

/**
 * Creates a Yjs collaboration session for a given itinerary room.
 * If NEXT_PUBLIC_YJS_SERVER_URL is not configured, returns null (collaboration disabled).
 *
 * @param roomId - The itinerary UUID (used as room name)
 * @param token  - Supabase access token for server-side auth
 * @returns CollaborationSession or null if collaboration is not configured
 */
export function createCollaborationSession(
  roomId: string,
  token: string,
): CollaborationSession | null {
  if (!WS_SERVER_URL) {
    console.warn(
      "Collaboration disabled: NEXT_PUBLIC_YJS_SERVER_URL environment variable is not set.",
    );
    return null;
  }

  const doc = new Y.Doc();

  const provider = new WebsocketProvider(WS_SERVER_URL, roomId, doc, {
    params: { token },
    connect: true,
  });

  return { room_id: roomId, doc, provider };
}

export function destroyCollaborationSession(session: CollaborationSession | null): void {
  if (!session) return;
  session.provider.destroy();
  session.doc.destroy();
}
