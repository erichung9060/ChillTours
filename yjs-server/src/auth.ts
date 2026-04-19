// server/src/auth.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// service role client — 只在 server 端用，可以驗證任意 JWT
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export interface AuthResult {
  userId: string;
  email: string;
}

/**
 * Verifies a Supabase JWT and returns user info.
 * Returns null if token is invalid or missing.
 */
export async function verifyToken(token: string): Promise<AuthResult | null> {
  if (!token) return null;

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id, email: user.email ?? "" };
  } catch {
    return null;
  }
}
