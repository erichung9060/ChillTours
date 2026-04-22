// server/src/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// mock @supabase/supabase-js
vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: vi.fn(),
  };
});

import { checkAccess } from "../auth.js";
import { createClient } from "@supabase/supabase-js";

describe("checkAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns access when user is owner or email shared", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", is_anonymous: false } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: "room-1" } }),
          }),
        }),
      }),
      rpc: vi.fn(),
    };

    // @ts-expect-error - Mocking Supabase client for testing
    vi.mocked(createClient).mockReturnValue(mockClient);

    const result = await checkAccess("valid-token", "room-1");
    expect(result).toEqual({ userId: "user-123", isAnonymous: false, hasAccess: true });
    expect(mockClient.from).toHaveBeenCalledWith("itineraries");
    expect(mockClient.rpc).not.toHaveBeenCalled();
  });

  it("returns access when link share allows", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-anon", is_anonymous: true } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          }),
        }),
      }),
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "room-1" }, error: null }),
      }),
    };

    // @ts-expect-error - Mocking Supabase client for testing
    vi.mocked(createClient).mockReturnValue(mockClient);

    const result = await checkAccess("valid-anon-token", "room-1");
    expect(result).toEqual({ userId: "user-anon", isAnonymous: true, hasAccess: true });
    expect(mockClient.rpc).toHaveBeenCalledWith("get_public_itinerary", { p_id: "room-1" });
  });

  it("returns no access when both checks fail", async () => {
    const mockClient = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-123", is_anonymous: false } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          }),
        }),
      }),
      rpc: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      }),
    };

    // @ts-expect-error - Mocking Supabase client for testing
    vi.mocked(createClient).mockReturnValue(mockClient);

    const result = await checkAccess("valid-token", "room-2");
    expect(result).toEqual({ userId: "user-123", isAnonymous: false, hasAccess: false });
  });

  it("returns null for invalid token", async () => {
    const mockClient = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: null }, error: { message: "Invalid token" } }),
      },
    };

    // @ts-expect-error - Mocking Supabase client for testing
    vi.mocked(createClient).mockReturnValue(mockClient);

    const result = await checkAccess("bad-token", "room-1");
    expect(result).toBeNull();
  });

  it("returns null for empty token", async () => {
    const result = await checkAccess("", "room-1");
    expect(result).toBeNull();
  });
});
