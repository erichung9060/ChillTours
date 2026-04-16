import { create } from "zustand";
import type { ProfileRow } from "@/lib/supabase/profiles";

interface ProfileStore {
  profile: ProfileRow | null;
  setProfile: (profile: ProfileRow | null) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
