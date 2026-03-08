import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyUser } from "../_shared/auth.ts";

import { z } from "npm:zod";

const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
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

type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * Build a structured prompt for chat with itinerary context
 */
function buildChatPrompt(
  message: string,
  itineraryContext?: ChatRequest["itinerary_context"]
): string {
  let prompt = `You are a helpful travel planning assistant. The user is planning a trip and may ask you to modify their itinerary, suggest activities, or answer questions about their travel plans.

`;

  // Include itinerary context if available
  if (itineraryContext) {
    prompt += `Current Itinerary Context:
- Title: ${itineraryContext.title}
- Destination: ${itineraryContext.destination}
- Trip Duration: ${itineraryContext.start_date} to ${itineraryContext.end_date}

Days and Activities (Note: Activity indices are 0-based, starting from 0):
`;

    itineraryContext.days.forEach((day) => {
      // Parse start_date and add day_number offset (minus 1 as day_number is 1-indexed)
      const startDate = new Date(itineraryContext.start_date + "T00:00:00");
      startDate.setDate(startDate.getDate() + (day.day_number - 1));
      const dateStr = startDate.toISOString().split("T")[0];

      prompt += `\nDay ${day.day_number} (${dateStr}):\n`;
      day.activities.forEach((activity, index) => {
        prompt += `  [${index}] ${activity.time}: ${activity.title} at ${activity.location.name}\n`;
        prompt += `      Note: ${activity.note}\n`;
        prompt += `      Duration: ${activity.duration_minutes} minutes\n`;
      });
    });

    prompt += "\n";
  }

  prompt += `
IMPORTANT BEHAVIOR RULES
1. If the user asks to add, remove, change, move, or rearrange itinerary activities, you MUST:
   - First respond with a brief natural-language explanation of your suggestions.
   - Then include a JSON block at the END of your response describing the exact operations.
2. If the user does NOT request itinerary modifications, respond normally in natural language ONLY.

NON-NEGOTIABLE RULES
- Never output ITINERARY_OPERATIONS and a JSON block unless itinerary changes are being suggested
- Operations are applied in sequence; order matters
- All activity_index and insert_at values are 0-based
- Use MOVE instead of REMOVE + ADD when relocating activities
- Do not include explanations inside the JSON block

--------------------------------
OPERATIONS FORMAT
--------------------------------

ITINERARY_OPERATIONS:
{
  "operations": [
    {
      "type": "ADD",
      "day_number": 2,
      "activity": {
        "time": "14:00",
        "title": "Tokyo Tower",
        "note": "Best visited at sunset for great city views",
        "location": {
          "name": "Tokyo Tower",
          "lat": 35.6586,
          "lng": 139.7454
        },
        "duration_minutes": 90,
        "insert_at": 2
      }
    },
    {
      "type": "REMOVE",
      "day_number": 1,
      "activity_index": 1
    },
    {
      "type": "UPDATE",
      "day_number": 3,
      "activity_index": 0,
      "changes": {
        "time": "15:00",
        "title": "Updated Title"
      }
    },
    {
      "type": "MOVE",
      "from_day_number": 2,
      "from_activity_index": 2,
      "to_day_number": 3,
      "insert_at": 0
    },
    {
      "type": "REORDER",
      "day_number": 1,
      "activity_order": [1, 0, 2]
    }
  ]
}

--------------------------------
AVAILABLE OPERATION TYPES
--------------------------------

1. ADD
- Use when creating a completely new activity.
- Required: type, day_number, activity (time, title, location with name/lat/lng)
- Optional: note (leave empty if no special tips), duration_minutes (default: 60), insert_at (0-based, default: append)

2. REMOVE
- Use when deleting an activity without adding it elsewhere.
- Required: type, day_number
- Optional: activity_index (0-based). IF OMITTED, THE ENTIRE DAY WILL BE REMOVED.

3. UPDATE
- Use when modifying an existing activity.
- Required: type, day_number, activity_index (0-based), changes
- Changes may include: time, title, note (leave empty if no special tips), location (partial), duration_minutes

4. MOVE
- Use when relocating an existing activity to a different day.
- Required: type, from_day_number, from_activity_index (0-based), to_day_number
- Optional: insert_at (0-based, default: append)
- IMPORTANT: MOVE preserves all activity details.

5. REORDER
- Use when changing the order of activities within the same day.
- Required: type, day_number, activity_order (array of 0-based indices)
- Example: [1, 0, 2] moves the second activity to first position.


IMPORTANT: METADATA CHANGES NOT ALLOWED

You CANNOT modify trip-level metadata (title, destination, start_date, end_date) 
through operations. If the user requests to change these details, YOU MUST politely inform 
them to use the dedicated UI controls by clicking the pencil icon in the top-left corner of the itinerary.

Respond to the user's message: ${message}`;

  return prompt;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 驗證用戶是否已登入
    const user = await verifyUser(req);

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized. Please log in to use this feature.",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    const parsed = ChatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request data",
          details: parsed.error.issues,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { message, history, itinerary_context }: ChatRequest = parsed.data;

    // Get Gemini API key from environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Gemini AI with Google Search Grounding
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = Deno.env.get("GEMINI_MODEL");
    const model = genAI.getGenerativeModel({
      model: modelName,
      tools: [
        {
          googleSearch: {},
        },
      ],
    });

    // Build conversation history for Gemini
    const conversationHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    // Start chat with history
    const chat = model.startChat({
      history: conversationHistory,
    });

    // Build prompt with context
    const prompt = buildChatPrompt(message, itinerary_context);

    // Generate response with streaming
    const result = await chat.sendMessageStream(prompt);

    // Set up streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream chunks from Gemini directly to client
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }

          controller.close();
        } catch (error) {
          console.error("Error during streaming:", error);
          controller.error(error);
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat function:", error);

    // Implement retry logic for transient errors
    const isTransientError =
      error instanceof Error &&
      (error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("ECONNREFUSED"));

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again later.",
        retryable: isTransientError,
      }),
      {
        status: isTransientError ? 503 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
