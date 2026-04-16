import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useProfile } from "@/hooks/use-profile";
import { useProfileStore } from "@/lib/stores/profile-store";
import * as profilesModule from "@/lib/supabase/profiles";

vi.mock("@/lib/supabase/profiles");
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/use-auth";

const mockUser = { id: "user-123", email: "test@example.com", user_metadata: {} };

const mockProfile = {
  id: "user-123",
  email: "test@example.com",
  full_name: "Test User",
  avatar_url: null,
  tier: "free" as const,
  credits: 500,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("useProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProfileStore.setState({ profile: null });
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);
  });

  it("should return null profile and defaults when no user is logged in", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null } as never);

    const { result } = renderHook(() => useProfile());

    expect(result.current.profile).toBeNull();
    expect(result.current.credits).toBe(0);
    expect(result.current.tier).toBe("free");
  });

  it("should fetch and return profile when user is logged in", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
    vi.mocked(profilesModule.getProfile).mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.profile).toEqual(mockProfile);
    });

    expect(result.current.credits).toBe(500);
    expect(result.current.tier).toBe("free");
    expect(profilesModule.getProfile).toHaveBeenCalledWith("user-123");
  });

  it("should not fetch again when profile.id already matches user.id (dedup)", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);

    // Pre-populate store as if already fetched for this user
    useProfileStore.setState({ profile: mockProfile }); // profile.id === "user-123"

    renderHook(() => useProfile());
    renderHook(() => useProfile()); // second caller

    await waitFor(() => {});

    expect(profilesModule.getProfile).not.toHaveBeenCalled();
  });

  it("should re-fetch from server on refreshProfile()", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
    const updatedProfile = { ...mockProfile, credits: 300 };
    vi.mocked(profilesModule.getProfile)
      .mockResolvedValueOnce(mockProfile)
      .mockResolvedValueOnce(updatedProfile);

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.credits).toBe(500);
    });

    await act(async () => {
      await result.current.refreshProfile();
    });

    expect(result.current.credits).toBe(300);
    expect(profilesModule.getProfile).toHaveBeenCalledTimes(2);
  });

  it("should silently degrade on useEffect fetch error (set profile to null)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
    vi.mocked(profilesModule.getProfile).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.profile).toBeNull();
    });

    expect(result.current.credits).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to load profile:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should propagate error from refreshProfile() to caller", async () => {
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never);
    vi.mocked(profilesModule.getProfile)
      .mockResolvedValueOnce(mockProfile)
      .mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useProfile());

    await waitFor(() => {
      expect(result.current.credits).toBe(500);
    });

    await expect(async () => {
      await act(async () => {
        await result.current.refreshProfile();
      });
    }).rejects.toThrow("Server error");
  });
});
