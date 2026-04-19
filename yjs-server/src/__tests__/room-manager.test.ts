// server/src/__tests__/room-manager.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { RoomManager } from "../room-manager.js";

const ROOM = "room-1";
const MAX = 3;

describe("RoomManager", () => {
  let mgr: RoomManager;
  beforeEach(() => {
    mgr = new RoomManager(MAX);
  });

  it("canJoin returns true when room is empty", () => {
    expect(mgr.canJoin(ROOM)).toBe(true);
  });

  it("canJoin returns false when room is full", () => {
    mgr.join(ROOM, "ws-1");
    mgr.join(ROOM, "ws-2");
    mgr.join(ROOM, "ws-3");
    expect(mgr.canJoin(ROOM)).toBe(false);
  });

  it("leave reduces count and allows new join", () => {
    mgr.join(ROOM, "ws-1");
    mgr.join(ROOM, "ws-2");
    mgr.join(ROOM, "ws-3");
    mgr.leave(ROOM, "ws-1");
    expect(mgr.canJoin(ROOM)).toBe(true);
  });

  it("cleans up empty rooms", () => {
    mgr.join(ROOM, "ws-1");
    mgr.leave(ROOM, "ws-1");
    expect(mgr.roomCount()).toBe(0);
  });

  it("counts correctly across multiple rooms", () => {
    mgr.join("room-a", "ws-1");
    mgr.join("room-b", "ws-2");
    expect(mgr.connectionCount("room-a")).toBe(1);
    expect(mgr.connectionCount("room-b")).toBe(1);
  });
});
