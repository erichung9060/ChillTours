import { create } from "zustand";
import type { ProfileRow } from "@/lib/supabase/profiles";

interface ProfileStore {
  profile: ProfileRow | null;
  setProfile: (profile: ProfileRow | null) => void;
  updateProfile: (updater: (prev: ProfileRow | null) => ProfileRow | null) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: (updater) => set((state) => ({ profile: updater(state.profile) })),
}));
