import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { JSONParser } from "npm:@streamparser/json";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyUser } from "../_shared/auth.ts";

import { z } from "npm:zod";

const GenerateRequestSchema = z.object({
  itinerary_id: z.string().min(1, "Itinerary ID is required"),
  locale: z.string().optional(),
});

type GenerateItineraryRequest = z.infer<typeof GenerateRequestSchema>;

function createSupabaseAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, serviceKey);
}

function createSupabaseClient(authHeader: string) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

import { buildItineraryPrompt } from "./prompt.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await verifyUser(req);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized.", code: "UNAUTHORIZED" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const parsed = GenerateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: parsed.error.issues,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { itinerary_id, locale }: GenerateItineraryRequest = parsed.data;

    const modelName = Deno.env.get("GEMINI_MODEL");
    if (!modelName) {
      console.error("GEMINI_MODEL env var not configured");
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY env var not configured");
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const supabaseClient = createSupabaseClient(req.headers.get("Authorization")!);

    // Fetch itinerary from DB — relying on RLS to enforce user ownership
    const { data: itineraryRow, error: fetchError } = await supabaseClient
      .from("itineraries")
      .select("id, user_id, destination, start_date, end_date, preferences, status")
      .eq("id", itinerary_id)
      .single();

    if (fetchError || !itineraryRow) {
      return new Response(
        JSON.stringify({ error: "Itinerary not found or forbidden", code: "NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { destination, start_date: startDate, end_date: endDate, preferences } = itineraryRow;

    // Atomic concurrency guard: use conditional update to prevent race conditions
    // Only allow transition from draft/failed to generating
    // Using Admin client to bypass RLS for background updates
    const { data: updateResult, error: updateError } = await supabaseAdmin
      .from("itineraries")
      .update({ status: "generating" })
      .eq("id", itinerary_id)
      .in("status", ["draft", "failed"])
      .select("id")
      .single();

    if (updateError || !updateResult) {
      // Update failed — either already generating or already completed
      // Re-fetch to get current status for accurate error message
      const { data: currentRow } = await supabaseAdmin
        .from("itineraries")
        .select("status")
        .eq("id", itinerary_id)
        .single();

      if (currentRow?.status === "generating") {
        return new Response(
          JSON.stringify({ error: "Generation already in progress", code: "ALREADY_GENERATING" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (currentRow?.status === "completed") {
        return new Response(
          JSON.stringify({ error: "Itinerary already generated", code: "ALREADY_COMPLETED" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Unknown error
      console.error("Failed to start generation:", updateError, "Current status:", currentRow?.status);
      return new Response(
        JSON.stringify({ error: "Failed to start generation", code: "UPDATE_FAILED" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const prompt = buildItineraryPrompt(destination, startDate, endDate, preferences ?? undefined, locale);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let clientDisconnected = false;

        function emitSSE(eventType: string, data: object) {
          if (clientDisconnected) return;
          try {
            const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          } catch (e) {
            console.log("Client disconnected, background generation continuing...");
            clientDisconnected = true;
          }
        }

        // Track days and activities for DB save
        const dayMap = new Map<number, {
          day_number: number;
          activities: object[];
        }>();

        // @streamparser/json: fire onValue for each complete activity object
        // paths: ["$.itinerary.*.activities.*"] means each activity in each day
        const parser = new JSONParser({ paths: ["$.itinerary.*.activities.*"] });

        parser.onValue = ({ value, key, parent, stack }: { value: unknown; key: unknown; parent: unknown; stack: unknown }) => {
          const activity = value as {
            time: string;
            title: string;
            description: string;
            location: { name: string; lat: number; lng: number };
            duration_minutes: number;
          };

          if (!activity.time || !activity.title) return;

          // Extract day_number from JSONPath stack
          // stack format: [root, "itinerary", dayIndex, "activities", activityIndex]
          // Each element is a StackElement { key, value, partial }
          const dayIndex = (stack as any[])[2].key as number;
          const day_number = dayIndex + 1; // Convert 0-based index to 1-based day number

          // Add UUID and order
          const activityWithId = {
            ...activity,
            id: crypto.randomUUID(),
            order: dayMap.get(day_number)?.activities.length ?? 0,
          };

          // Emit immediately
          emitSSE("activity", {
            day_number,
            activity: activityWithId,
          });

          // Accumulate for DB save
          if (!dayMap.has(day_number)) {
            dayMap.set(day_number, { day_number, activities: [] });
          }
          dayMap.get(day_number)!.activities.push(activityWithId);
        };

        try {
          const result = await model.generateContentStream(prompt);
          let accumulatedText = "";
          let jsonStarted = false;

          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (!text) continue;

            accumulatedText += text;

            if (!jsonStarted) {
              // Look for the start of JSON
              const jsonStartIndex = accumulatedText.indexOf("{");
              if (jsonStartIndex === -1) continue;
              
              // Found JSON, extract from start and mark as started
              jsonStarted = true;
              accumulatedText = accumulatedText.substring(jsonStartIndex);
            }

            // Remove markdown code fences (both ``` and ```json)
            const cleaned = accumulatedText.replace(/```(?:json)?/gi, "");
            
            // Only write the new content to parser
            if (cleaned) {
              parser.write(cleaned);
              accumulatedText = ""; // Clear buffer after writing
            }
          }

          // Convert map to sorted array
          const allDays = Array.from(dayMap.values()).sort((a, b) => a.day_number - b.day_number);

          // Save complete itinerary to DB
          const { error: updateError } = await supabaseAdmin
            .from("itineraries")
            .update({
              status: "completed",
              data: { days: allDays },
            })
            .eq("id", itinerary_id);

          if (updateError) {
            console.error("Failed to save itinerary to DB:", updateError);
            await supabaseAdmin
              .from("itineraries")
              .update({ status: "failed" })
              .eq("id", itinerary_id);
            emitSSE("error", { message: "Internal server error" });
            if (!clientDisconnected) {
              try { controller.close(); } catch (e) { }
            }
            return;
          }

          emitSSE("complete", {});
          if (!clientDisconnected) {
            try { controller.close(); } catch (e) { }
          }
        } catch (error) {
          console.error("Streaming error:", error);

          await supabaseAdmin
            .from("itineraries")
            .update({ status: "failed" })
            .eq("id", itinerary_id);

          emitSSE("error", { message: "Internal server error" });
          if (!clientDisconnected) {
            try { controller.close(); } catch (e) { }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
