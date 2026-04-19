// server/src/index.ts
import "dotenv/config";
import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "y-websocket/dist/src/utils.js";
import { RoomManager } from "./room-manager.js";
import { checkAccess } from "./auth.js";

const PORT = Number(process.env.PORT ?? 1234);
const MAX_CONNECTIONS_PER_ROOM = Number(process.env.MAX_CONNECTIONS_PER_ROOM ?? 20);

const roomManager = new RoomManager(MAX_CONNECTIONS_PER_ROOM);

const server = http.createServer((_, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ok");
});

const wss = new WebSocketServer({ server });

wss.on("connection", async (ws, req) => {
  const connId = crypto.randomUUID();

  const url = new URL(req.url ?? "/", `http://localhost`);
  const roomId = url.pathname.replace(/^\//, "");

  if (!roomId || !/^[0-9a-f-]{36}$/.test(roomId)) {
    ws.close(4000, "Invalid room");
    return;
  }

  const token = url.searchParams.get("token") ?? "";
  const result = await checkAccess(token, roomId);

  if (!result) {
    ws.close(4001, "Unauthorized");
    return;
  }

  if (!result.hasAccess) {
    ws.close(4003, "Forbidden");
    return;
  }

  if (!roomManager.canJoin(roomId)) {
    ws.close(4029, "Room is full");
    return;
  }

  roomManager.join(roomId, connId);

  console.log(
    `[connect] user=${result.userId} anon=${result.isAnonymous} room=${roomId} ` +
      `room_size=${roomManager.connectionCount(roomId)}`,
  );

  ws.on("close", () => {
    roomManager.leave(roomId, connId);
    console.log(`[disconnect] user=${result.userId} room=${roomId}`);
  });

  setupWSConnection(ws, req, { docName: roomId });
});

server.listen(PORT, () => {
  console.log(`yjs-server listening on :${PORT}`);
});
