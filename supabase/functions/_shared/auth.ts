import { createSupabaseAnonClient } from "./supabase.ts";

/**
 * 驗證用戶是否已登入
 * 使用 Supabase Auth 的 getUser() 方法驗證 JWT
 * 拒絕匿名用戶的請求
 */
export async function verifyUser(req: Request): Promise<{ userId: string; email: string } | null> {
  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid Authorization header");
      return null;
    }

    const jwt = authHeader.replace("Bearer ", "");

    const supabase = createSupabaseAnonClient();

    // 使用 getUser() 驗證 JWT 並取得用戶資訊
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(jwt);

    if (error || !user) {
      console.log("❌ Invalid token or user not found:", error?.message);
      return null;
    }

    // 拒絕匿名用戶
    if (user.is_anonymous) {
      console.log("❌ Anonymous users are not allowed");
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
