import { type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const CREDIT_COSTS = {
  GENERATE_ITINERARY: 100,
  CHAT: 10,
} as const;

export type CreditAction = keyof typeof CREDIT_COSTS;

export async function captureCredits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  action: CreditAction,
): Promise<{ success: boolean; error?: string }> {
  const cost = CREDIT_COSTS[action];
  const { data, error } = await supabaseAdmin.rpc("capture_credits", {
    p_user_id: userId,
    p_amount: cost,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data === true };
}

export async function refundCredits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  action: CreditAction,
): Promise<{ success: boolean; error?: string }> {
  const cost = CREDIT_COSTS[action];
  const { data, error } = await supabaseAdmin.rpc("refund_credits", {
    p_user_id: userId,
    p_amount: cost,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: data === true };
}
