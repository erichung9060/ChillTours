// Type declarations for y-websocket
declare module "y-websocket/dist/src/utils.js" {
  import type { IncomingMessage } from "http";
  import type WebSocket from "ws";

  export function setupWSConnection(
    conn: WebSocket,
    req: IncomingMessage,
    options?: { docName?: string; gc?: boolean },
  ): void;
}
