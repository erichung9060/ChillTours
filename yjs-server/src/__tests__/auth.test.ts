// server/src/__tests__/auth.test.ts
import { describe, it, expect, vi } from "vitest";

// mock @supabase/supabase-js
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockImplementation(async (token: string) => {
        if (token === "valid-token") {
          return { data: { user: { id: "user-123", email: "test@example.com" } }, error: null };
        }
        return { data: { user: null }, error: { message: "Invalid token" } };
      }),
    },
  }),
}));

const { verifyToken } = await import("../auth.js");

describe("verifyToken", () => {
  it("returns userId for valid token", async () => {
    const result = await verifyToken("valid-token");
    expect(result).toEqual({ userId: "user-123", email: "test@example.com" });
  });

  it("returns null for invalid token", async () => {
    const result = await verifyToken("bad-token");
    expect(result).toBeNull();
  });

  it("returns null for empty token", async () => {
    const result = await verifyToken("");
    expect(result).toBeNull();
  });
});
