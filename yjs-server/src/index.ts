// server/src/index.ts
import "dotenv/config";
import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/bin/utils";
import { RoomManager } from "./room-manager.js";
import { verifyToken } from "./auth.js";

const PORT = Number(process.env.PORT ?? 1234);
const MAX_CONNECTIONS_PER_ROOM = Number(process.env.MAX_CONNECTIONS_PER_ROOM ?? 20);

const roomManager = new RoomManager(MAX_CONNECTIONS_PER_ROOM);

const server = http.createServer((_, res) => {
  // Health check endpoint
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

const wss = new WebSocketServer({ server });

wss.on("connection", async (ws, req) => {
  const connId = crypto.randomUUID();

  // ── 1. Parse room from URL ──────────────────────────────
  const url = new URL(req.url ?? "/", `http://localhost`);
  // y-websocket client connects to /<room-name>
  const roomId = url.pathname.replace(/^\//, "");

  if (!roomId || !/^[0-9a-f-]{36}$/.test(roomId)) {
    ws.close(4000, "Invalid room");
    return;
  }

  // ── 2. Verify auth token ────────────────────────────────
  // Token passed as query param: ?token=<supabase_jwt>
  const token = url.searchParams.get("token") ?? "";
  const user = await verifyToken(token);

  if (!user) {
    ws.close(4001, "Unauthorized");
    return;
  }

  // ── 3. Per-room connection limit ────────────────────────
  if (!roomManager.canJoin(roomId)) {
    ws.close(4029, "Room is full");
    return;
  }

  // ── 4. Register connection ──────────────────────────────
  roomManager.join(roomId, connId);

  console.log(
    `[connect] user=${user.userId} room=${roomId} ` +
      `room_size=${roomManager.connectionCount(roomId)}`,
  );

  ws.on("close", () => {
    roomManager.leave(roomId, connId);
    console.log(`[disconnect] user=${user.userId} room=${roomId}`);
  });

  // ── 5. Hand off to y-websocket ──────────────────────────
  setupWSConnection(ws, req, { docName: roomId });
});

server.listen(PORT, () => {
  console.log(`yjs-server listening on :${PORT}`);
});
