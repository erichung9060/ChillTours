import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/lib/supabase/client";
import { getProfile } from "@/lib/supabase/profiles";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe("getProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and return the user profile for a given user ID", async () => {
    const mockProfile = {
      id: "user-123",
      email: "test@example.com",
      full_name: "Test User",
      avatar_url: null,
      tier: "free",
      credits: 500,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    const mockSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

    const result = await getProfile("user-123");

    expect(supabase.from).toHaveBeenCalledWith("profiles");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
    expect(result).toEqual(mockProfile);
  });

  it("should return null when profile is not found (PGRST116)", async () => {
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Not found", code: "PGRST116" },
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

    const result = await getProfile("nonexistent");

    expect(result).toBeNull();
  });

  it("should throw error for non-404 errors", async () => {
    const mockError = { message: "Network error", code: "NETWORK_ERROR" };
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: mockError,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as never);

    await expect(getProfile("user-123")).rejects.toEqual(mockError);
  });
});
