// server/src/auth.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export interface AccessResult {
  userId: string;
  isAnonymous: boolean;
  hasAccess: boolean;
}

export async function checkAccess(
  token: string,
  roomId: string,
): Promise<AccessResult | null> {
  if (!token) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  try {
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user) return null;

    const { data: directData } = await client
      .from("itineraries")
      .select("id")
      .eq("id", roomId)
      .single();

    if (directData) {
      return {
        userId: user.id,
        isAnonymous: user.is_anonymous ?? false,
        hasAccess: true,
      };
    }

    const { data: rpcData, error: rpcError } = await client
      .rpc("get_public_itinerary", { p_id: roomId })
      .single();

    return {
      userId: user.id,
      isAnonymous: user.is_anonymous ?? false,
      hasAccess: !!(rpcData && !rpcError),
    };
  } catch {
    return null;
  }
}
