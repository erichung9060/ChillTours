/**
 * CORS headers for Supabase Edge Functions
 * Allows requests from any origin in development
 * Should be restricted to specific domains in production
 */
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
