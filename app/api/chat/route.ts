import { NextRequest } from "next/server";
import { z } from "zod";
import { validateEdgeProxyRequest } from "@/lib/api/edge-proxy";

const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, "Message is required"),
  history: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  itinerary_context: z
    .object({
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
            }),
          ),
        }),
      ),
    })
    .optional(),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(request: NextRequest) {
  const validated = await validateEdgeProxyRequest(request, ChatRequestSchema);
  if (validated instanceof Response) {
    return validated;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
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
