// server/src/room-manager.ts

/**
 * Tracks WebSocket connections per room.
 * Uses string IDs (ws connection id) instead of WebSocket objects
 * to keep this module testable without real WebSocket instances.
 */
export class RoomManager {
  private rooms = new Map<string, Set<string>>();
  private readonly maxPerRoom: number;

  constructor(maxPerRoom: number) {
    this.maxPerRoom = maxPerRoom;
  }

  canJoin(roomId: string): boolean {
    const conns = this.rooms.get(roomId);
    return !conns || conns.size < this.maxPerRoom;
  }

  join(roomId: string, connId: string): void {
    let conns = this.rooms.get(roomId);
    if (!conns) {
      conns = new Set();
      this.rooms.set(roomId, conns);
    }
    conns.add(connId);
  }

  leave(roomId: string, connId: string): void {
    const conns = this.rooms.get(roomId);
    if (!conns) return;
    conns.delete(connId);
    if (conns.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  connectionCount(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  roomCount(): number {
    return this.rooms.size;
  }
}
