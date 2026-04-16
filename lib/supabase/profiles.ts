import { supabase } from "./client";
import type { Database } from "./database.types";

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Fetch a user's profile by their auth user ID.
 * Throws error if fetch fails - caller must handle.
 * Returns null only if profile doesn't exist (404).
 */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    // not found (profile doesn't exist)
    if (error.code === "PGRST116") {
      return null;
    }
    // All other errors: rethrow for caller to handle
    throw error;
  }

  return data;
}
