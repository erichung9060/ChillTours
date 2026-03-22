import { NextRequest } from "next/server";
import { z } from "zod";

const GenerateRequestSchema = z.object({
  itinerary_id: z.string().min(1, "Itinerary ID is required"),
  locale: z.string().optional(),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(request: NextRequest) {
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
    let buffer = "";
    let activityCount = 0;
    console.info("\n[generate-itinerary] Gemini stream started");
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const event of events) {
          const lines = event.split("\n");
          const eventType = lines.find((l) => l.startsWith("event:"))?.slice(6).trim();
          const dataLine  = lines.find((l) => l.startsWith("data:"))?.slice(5).trim();
          if (eventType === "activity" && dataLine) {
            try {
              const { day_number, activity } = JSON.parse(dataLine);
              activityCount++;
              const tag = activity.type ? ` [${activity.type}]` : "";
              const hours = activity.opening_hours ? ` hours=${activity.opening_hours.open}–${activity.opening_hours.close}` : "";
              console.info(`  [Day ${day_number}] ${activity.time} ${activity.title} (${activity.duration_minutes}min)${tag}${hours}`);
            } catch { /* ignore parse errors */ }
          } else if (eventType === "complete") {
            console.info(`[generate-itinerary] complete — ${activityCount} activities generated`);
          } else if (eventType === "error") {
            console.error(`[generate-itinerary] error:`, dataLine);
          }
        }
      }
    } catch { /* ignore logging errors */ }
  })();

  return new Response(stream1, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/json",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
