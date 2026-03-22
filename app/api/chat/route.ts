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
              lat: z.number(),
              lng: z.number(),
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
  if (!authHeader) {
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
  const parsed = ChatRequestSchema.safeParse(body);

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

  const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.body) {
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 分叉 stream：stream1 給 client，stream2 在背景 log
  const [stream1, stream2] = response.body.tee();

  (async () => {
    const reader = stream2.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }
      const opsMatch = fullText.match(/ITINERARY_OPERATIONS:\s*(\{[\s\S]*\})/);
      if (opsMatch) {
        try {
          const ops = JSON.parse(opsMatch[1]);
          const count = ops.operations?.length ?? 0;
          console.info(`\n[chat] Gemini operations (${count}):`);
          console.info(JSON.stringify(ops, null, 2));
        } catch {
          console.info("\n[chat] Gemini operations (parse failed):", opsMatch[1].slice(0, 200));
        }
      } else {
        const snippet = fullText.slice(0, 300).replace(/\n/g, " ");
        console.info(`\n[chat] Gemini response (${fullText.length} chars): ${snippet}`);
      }
    } catch { /* ignore logging errors */ }
  })();

  return new Response(stream1, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
