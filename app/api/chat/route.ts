import { NextRequest } from "next/server";
import { z } from "zod";

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  itinerary_context: z.object({
    id: z.string(),
    title: z.string(),
    destination: z.string(),
    start_date: z.string(),
    end_date: z.string(),
    days: z.array(
      z.object({
        day_number: z.number().int().min(1),
        activities: z.array(
          z.object({
            id: z.string(),
            time: z.string(),
            title: z.string(),
            note: z.string(),
            location: z.object({
              name: z.string(),
            }),
            duration_minutes: z.number().int().positive(),
          })
        ),
      })
    ),
  }).optional(),
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

  const parsed = ChatRequestSchema.safeParse(body);
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

  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader.trim(),
    },
    body: JSON.stringify(parsed.data),
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
