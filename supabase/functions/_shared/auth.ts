import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * 驗證用戶是否已登入
 * 使用 Supabase Auth 的 getUser() 方法驗證 JWT
 */
export async function verifyUser(req: Request): Promise<{ userId: string; email: string } | null> {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid Authorization header");
      return null;
    }

    const jwt = authHeader.replace("Bearer ", "");

    // 建立 Supabase client（使用 anon key 即可）
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ Missing Supabase configuration");
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 使用 getUser() 驗證 JWT 並取得用戶資訊
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(jwt);

    if (error || !user) {
      console.log("❌ Invalid token or user not found:", error?.message);
      return null;
    }

    return {
      userId: user.id,
      email: user.email || "",
    };
  } catch (error) {
    console.error("❌ Error verifying user:", error);
    return null;
  }
}
