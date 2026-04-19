// lib/collaboration/provider.ts
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { CollaborationSession } from "@/types/collaboration";

const WS_SERVER_URL = process.env.NEXT_PUBLIC_YJS_SERVER_URL!;

/**
 * Creates a Yjs collaboration session for a given itinerary room.
 *
 * @param roomId - The itinerary UUID (used as room name)
 * @param token  - Supabase access token for server-side auth
 */
export function createCollaborationSession(roomId: string, token: string): CollaborationSession {
  const doc = new Y.Doc();

  const provider = new WebsocketProvider(WS_SERVER_URL, roomId, doc, {
    params: { token },
    connect: true,
  });

  return { room_id: roomId, doc, provider };
}

export function destroyCollaborationSession(session: CollaborationSession): void {
  session.provider.destroy();
  session.doc.destroy();
}
