import { NextRequest } from "next/server";
import { z } from "zod";
import { validateEdgeProxyRequest } from "@/lib/api/edge-proxy";

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
  const validated = await validateEdgeProxyRequest(request, ResolveRequestSchema);
  if (validated instanceof Response) {
    return validated;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/resolve-places`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: validated.authHeader,
      ...(gatewaySecret && { "x-gateway-secret": gatewaySecret }),
    },
    body: JSON.stringify(validated.data),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-cache",
    },
  });
}
