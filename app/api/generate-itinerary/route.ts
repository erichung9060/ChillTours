import { NextRequest } from "next/server";
import { z } from "zod";

const GenerateRequestSchema = z.object({
  itinerary_id: z.string().min(1, "Itinerary ID is required"),
  locale: z.string().optional(),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !/^Bearer\s+\S+$/i.test(authHeader.trim())) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        code: "UNAUTHORIZED",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    return new Response(
      JSON.stringify({
        error: "Unsupported Media Type",
        code: "UNSUPPORTED_MEDIA_TYPE",
      }),
      {
        status: 415,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: "Invalid request data",
        code: "INVALID_REQUEST",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "Invalid request data",
        code: "INVALID_REQUEST",
      }),
      {
        status: 400,
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
        Authorization: authHeader.trim(),
      },
      body: JSON.stringify(parsed.data),
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
