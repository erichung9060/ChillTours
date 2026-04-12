import { type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const CREDIT_COSTS = {
  GENERATE_ITINERARY: 100,
  CHAT: 10,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export async function checkCredits(
  supabaseClient: SupabaseClient,
  userId: string,
  action: CreditAction,
): Promise<{ sufficient: boolean; balance: number; error?: string }> {
  const cost = CREDIT_COSTS[action];
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return {
      sufficient: false,
      balance: 0,
      error: error?.message ?? "Profile not found",
    };
  }

  const balance = data.credits ?? 0;
  return { sufficient: balance >= cost, balance };
}

export async function deductCredits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  action: CreditAction,
): Promise<{ success: boolean; error?: string }> {
  const cost = CREDIT_COSTS[action];
  const { data, error } = await supabaseAdmin.rpc("deduct_credits", {
    p_user_id: userId,
    p_amount: cost,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data === true };
}
