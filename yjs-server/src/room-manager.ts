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


  tryJoin(roomId: string, connId: string): boolean {
    let conns = this.rooms.get(roomId);
    
    // Check capacity
    if (conns && conns.size >= this.maxPerRoom) {
      return false;
    }
    
    // Add connection
    if (!conns) {
      conns = new Set();
      this.rooms.set(roomId, conns);
    }
    conns.add(connId);
    return true;
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
