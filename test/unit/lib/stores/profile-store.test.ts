import { describe, it, expect, beforeEach } from "vitest";
import { useProfileStore } from "@/lib/stores/profile-store";

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

describe("useProfileStore", () => {
  beforeEach(() => {
    useProfileStore.setState({ profile: null });
  });

  it("should initialize with null profile", () => {
    const { profile } = useProfileStore.getState();
    expect(profile).toBeNull();
  });

  it("should set profile via setProfile", () => {
    useProfileStore.getState().setProfile(mockProfile);

    const { profile } = useProfileStore.getState();
    expect(profile).toEqual(mockProfile);
  });

  it("should clear profile when setProfile is called with null", () => {
    useProfileStore.getState().setProfile(mockProfile);
    useProfileStore.getState().setProfile(null);

    expect(useProfileStore.getState().profile).toBeNull();
  });

  it("should apply updater function via updateProfile", () => {
    useProfileStore.getState().setProfile(mockProfile);

    useProfileStore.getState().updateProfile((prev) =>
      prev ? { ...prev, credits: prev.credits! - 10 } : prev
    );

    expect(useProfileStore.getState().profile?.credits).toBe(490);
  });

  it("should do nothing via updateProfile when profile is null", () => {
    useProfileStore.getState().updateProfile((prev) =>
      prev ? { ...prev, credits: 0 } : prev
    );

    expect(useProfileStore.getState().profile).toBeNull();
  });
});
