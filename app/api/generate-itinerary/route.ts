import { NextRequest } from "next/server";
import { z } from "zod";

const GenerateRequestSchema = z.object({
  itinerary_id: z.string().min(1, "Itinerary ID is required"),
  locale: z.string().optional(),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = GenerateRequestSchema.safeParse(body);

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

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized. Please log in to generate itineraries.",
        code: "UNAUTHORIZED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/generate-itinerary`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    }
  );

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
