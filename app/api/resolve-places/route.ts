import { NextRequest } from "next/server";
import { z } from "zod";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const gatewaySecret = process.env.API_GATEWAY_SECRET || "";
const MAX_RESOLVE_PLACES = 10;

const PlaceInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

const ResolveRequestSchema = z.object({
  places: z.array(PlaceInputSchema).min(1).max(MAX_RESOLVE_PLACES),
});

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader.trim())) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized. Please log in to use this feature.",
        code: "UNAUTHORIZED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const body = await request.json();
  const parsed = ResolveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request data",
        details: parsed.error.issues,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/resolve-places`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader.trim(),
      ...(gatewaySecret && { "x-gateway-secret": gatewaySecret }),
    },
    body: JSON.stringify(parsed.data),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-cache",
    },
  });
}
