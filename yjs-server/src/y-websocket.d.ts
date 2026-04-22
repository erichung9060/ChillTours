// Type declarations for y-websocket v2 server utilities
declare module "y-websocket/bin/utils" {
  import type { IncomingMessage } from "http";
  import type WebSocket from "ws";
  import type * as Y from "yjs";

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: { docName?: string; gc?: boolean },
  ): void;

  /** In-memory map of room name → Y.Doc. Clear an entry to reset a room. */
  export const docs: Map<string, Y.Doc>;
}
