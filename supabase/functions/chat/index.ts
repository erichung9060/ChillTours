import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history: ChatMessage[];
  itinerary_context?: {
    id: string;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    days: Array<{
      day_number: number;
      date: string;
      activities: Array<{
        id: string;
        time: string;
        title: string;
        description: string;
        location: {
          name: string;
          lat: number;
          lng: number;
        };
        duration_minutes: number;
      }>;
    }>;
  };
}

/**
 * 驗證用戶是否已登入
 * 使用 Supabase Auth 的 getUser() 方法驗證 JWT
 */
async function verifyUser(req: Request): Promise<{ userId: string; email: string } | null> {
  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("❌ No valid Authorization header");
      return null;
    }

    const jwt = authHeader.replace("Bearer ", "");
    
    // 建立 Supabase client（使用 anon key 即可）
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ Missing Supabase configuration");
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // 使用 getUser() 驗證 JWT 並取得用戶資訊
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    
    if (error || !user) {
      console.log("❌ Invalid token or user not found:", error?.message);
      return null;
    }
    
    return {
      userId: user.id,
      email: user.email || "",
    };
  } catch (error) {
    console.error("❌ Error verifying user:", error);
    return null;
  }
}

/**
 * Build a structured prompt for chat with itinerary context
 */
function buildChatPrompt(
  message: string,
  itineraryContext?: ChatRequest['itinerary_context']
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
      prompt += `\nDay ${day.day_number} (${day.date}):\n`;
      day.activities.forEach((activity, index) => {
        prompt += `  [${index}] ${activity.time}: ${activity.title} at ${activity.location.name}\n`;
        prompt += `      Description: ${activity.description}\n`;
        prompt += `      Duration: ${activity.duration_minutes} minutes\n`;
      });
    });
    
    prompt += '\n';
  }

  prompt += `
IMPORTANT BEHAVIOR RULES
1. If the user asks to add, remove, change, move, or rearrange itinerary activities, you MUST:
   - First respond with a brief natural-language explanation of your suggestions.
   - Then include a JSON block at the END of your response describing the exact operations.
2. If the user does NOT request itinerary modifications, respond normally in natural language ONLY.
3. Never output a JSON block unless itinerary changes are being suggested.

NON-NEGOTIABLE RULES
- All activity_index and insert_at values are 0-based
- Use MOVE instead of REMOVE + ADD when relocating activities
- Operations are applied in sequence; order matters
- Only include ITINERARY_OPERATIONS when suggesting specific changes
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
        "description": "Visit the iconic tower",
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
  ],
  "metadata": {
    "title": "New trip title",
    "destination": "New destination",
    "start_date": "2026-03-01",
    "end_date": "2026-03-05"
  }
}

--------------------------------
AVAILABLE OPERATION TYPES
--------------------------------

1. ADD
- Use when creating a completely new activity.
- Required: type, day_number, activity (time, title, location with name/lat/lng)
- Optional: description, duration_minutes (default: 60), insert_at (0-based, default: append)

2. REMOVE
- Use when deleting an activity without adding it elsewhere.
- Required: type, day_number, activity_index (0-based)

3. UPDATE
- Use when modifying an existing activity.
- Required: type, day_number, activity_index (0-based), changes
- Changes may include: time, title, description, location (partial), duration_minutes

4. MOVE
- Use when relocating an existing activity to a different day.
- Required: type, from_day_number, from_activity_index (0-based), to_day_number
- Optional: insert_at (0-based, default: append)
- IMPORTANT: MOVE preserves all activity details.

5. REORDER
- Use when changing the order of activities within the same day.
- Required: type, day_number, activity_order (array of 0-based indices)
- Example: [1, 0, 2] moves the second activity to first position.

--------------------------------
METADATA (OPTIONAL)
--------------------------------

Modify trip-level info: title, destination, start_date, end_date (YYYY-MM-DD)

Date logic:
- Both start & end changed: Move entire trip to new dates, then adjust duration
- Only start changed: Add/remove days at beginning
- Only end changed: Add/remove days at end

Example: {"operations": [], "metadata": {"end_date": "2026-03-03"}}

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
          code: "UNAUTHORIZED"
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Parse request body
    const { message, history, itinerary_context }: ChatRequest =
      await req.json();

    // Validate required fields
    if (!message || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

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

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // Build conversation history for Gemini
    const conversationHistory = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Start chat with history
    const chat = model.startChat({
      history: conversationHistory,
    });

    // Build prompt with context
    const prompt = buildChatPrompt(
      message,
      itinerary_context
    );

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
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in chat function:", error);
    
    // Implement retry logic for transient errors
    const isTransientError = error instanceof Error && (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.message.includes('ECONNREFUSED')
    );

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
        retryable: isTransientError,
      }),
      {
        status: isTransientError ? 503 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
