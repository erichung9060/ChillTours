import { z } from "npm:zod";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyUser } from "../_shared/auth.ts";
import { resolvePlacesInfo } from "../_shared/place-resolver.ts";

// ──────────────────────────────────────────────
// Request / Response schemas
// ──────────────────────────────────────────────

const PlaceInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const MAX_RESOLVE_PLACES = 10;

const ResolveRequestSchema = z.object({
  places: z.array(PlaceInputSchema).min(1).max(MAX_RESOLVE_PLACES),
});

// ──────────────────────────────────────────────
// Edge Function handler
// ──────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // API Gateway Secret Check (Request from Next.JS api)
  const expectedSecret = Deno.env.get("API_GATEWAY_SECRET");
  const providedSecret = req.headers.get("x-gateway-secret");

  if (providedSecret !== expectedSecret) {
    console.warn("Blocked direct access attempt: Invalid Gateway Secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized.", code: "UNAUTHORIZED" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Auth
    const user = await verifyUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized.", code: "UNAUTHORIZED" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse body
    let body;
    try {
      body = await req.json();
    } catch (_err) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body. Expected JSON.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const parsed = ResolveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: parsed.error.issues,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { places } = parsed.data;

    // Resolve places sequentially to avoid Google API rate limits using the core logic
    const resolved = await resolvePlacesInfo(places);

    return new Response(JSON.stringify({ resolved }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Resolve places error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
