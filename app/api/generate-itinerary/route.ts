import { NextRequest } from "next/server";
import { z } from "zod";
import { validateEdgeProxyRequest } from "@/lib/api/edge-proxy";

const GenerateRequestSchema = z.object({
  itinerary_id: z.string().min(1, "Itinerary ID is required"),
  locale: z.string().optional(),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(request: NextRequest) {
  const validated = await validateEdgeProxyRequest(request, GenerateRequestSchema);
  if (validated instanceof Response) {
    return validated;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-itinerary`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: validated.authHeader,
    },
    body: JSON.stringify(validated.data),
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
