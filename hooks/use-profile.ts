import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProfileStore } from "@/lib/stores/profile-store";
import { getProfile, type ProfileRow } from "@/lib/supabase/profiles";
import type { UserTier } from "@/types/user";

interface UseProfileReturn {
  profile: ProfileRow | null;
  credits: number;
  tier: UserTier;
  /** Re-fetch profile from server (call after API operation completes). */
  refreshProfile: () => Promise<void>;
}

/**
 * Hook for accessing user profile data (credits, tier).
 *
 * State lives in a Zustand store — all components share the same data
 * without a Provider. The first caller to mount triggers the fetch;
 * subsequent callers read from the store without re-fetching.
 *
 * To migrate to React Query: replace the useEffect internals with
 * useQuery/useMutation. The public API stays identical.
 */
export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const { profile, setProfile } = useProfileStore();
  const fetchingForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || user.is_anonymous) {
      setProfile(null);
      fetchingForRef.current = null;
      return;
    }

    if (useProfileStore.getState().profile?.id === user.id) return;
    if (fetchingForRef.current === user.id) return;

    fetchingForRef.current = user.id;

    // Background fetch: silent degradation on error
    getProfile(user.id)
      .then((p) => setProfile(p))
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setProfile(null); // Show 0 credits, don't crash UI
      });
  }, [user, setProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;

    const p = await getProfile(user.id);
    setProfile(p);
  }, [user, setProfile]);

  return {
    profile,
    credits: profile?.credits ?? 0,
    tier: (profile?.tier as UserTier) ?? "free",
    refreshProfile,
  };
}
