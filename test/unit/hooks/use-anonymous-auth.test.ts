import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAnonymousAuth } from "@/hooks/use-anonymous-auth";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInAnonymously: vi.fn(),
    },
  },
}));

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";

describe("useAnonymousAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ready=false while auth is still loading", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true } as never);

    const { result } = renderHook(() => useAnonymousAuth());

    expect(result.current).toBe(false);
    expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("returns ready=true immediately when user is already logged in", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-123" },
      loading: false,
    } as never);

    const { result } = renderHook(() => useAnonymousAuth());

    await waitFor(() => expect(result.current).toBe(true));
    expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("calls signInAnonymously and returns ready=true when no user session", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    vi.mocked(supabase.auth.signInAnonymously).mockResolvedValue({} as never);

    const { result } = renderHook(() => useAnonymousAuth());

    await waitFor(() => expect(result.current).toBe(true));
    expect(supabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it("returns ready=true even when signInAnonymously fails", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as never);
    vi.mocked(supabase.auth.signInAnonymously).mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useAnonymousAuth());

    await waitFor(() => expect(result.current).toBe(true));
  });
});
