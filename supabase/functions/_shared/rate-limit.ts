export async function checkChatRateLimit(
    supabaseClient: any,
    userId: string,
    dailyLimit: number = 30
): Promise<{ allowed: boolean; error?: string }> {
    try {
        const { data: allowed, error } = await supabaseClient.rpc(
            "increment_and_check_chat_limit",
            { p_user_id: userId, p_daily_limit: dailyLimit }
        );

        if (error) {
            console.error("Rate limit check failed:", error);
            return { allowed: false, error: error.message };
        }

        return { allowed: allowed === true };
    } catch (err: any) {
        console.error("Unexpected error during rate limit check:", err);
        return { allowed: false, error: err.message || "Unknown error" };
    }
}
