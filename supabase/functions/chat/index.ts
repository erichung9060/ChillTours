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
          address: string;
          lat: number;
          lng: number;
        };
        duration_minutes: number;
      }>;
    }>;
  };
  custom_requirements?: string;
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

    console.log("✅ User authenticated:", user.email);
    
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
  itineraryContext?: ChatRequest['itinerary_context'],
  customRequirements?: string
): string {
  let prompt = `You are a helpful travel planning assistant. The user is planning a trip and may ask you to modify their itinerary, suggest activities, or answer questions about their travel plans.

`;

  // Include itinerary context if available
  if (itineraryContext) {
    prompt += `Current Itinerary Context:
- Destination: ${itineraryContext.destination}
- Trip Duration: ${itineraryContext.start_date} to ${itineraryContext.end_date}
- Title: ${itineraryContext.title}

Days and Activities:
`;
    
    itineraryContext.days.forEach((day) => {
      prompt += `\nDay ${day.day_number} (${day.date}):\n`;
      day.activities.forEach((activity) => {
        prompt += `  - ${activity.time}: ${activity.title} at ${activity.location.name}\n`;
        prompt += `    Description: ${activity.description}\n`;
        prompt += `    Duration: ${activity.duration_minutes} minutes\n`;
      });
    });
    
    prompt += '\n';
  }

  // Include custom requirements if available
  if (customRequirements) {
    prompt += `Original Custom Requirements: ${customRequirements}\n\n`;
  }

  prompt += `User Message: ${message}

IMPORTANT INSTRUCTIONS:
1. If the user asks to modify the itinerary (add/remove/change activities), respond with your suggestions in natural language.
2. If you suggest itinerary changes, include a JSON block at the END of your response with the following format:

ITINERARY_UPDATE:
{
  "action": "update",
  "changes": {
    "days": [
      {
        "day_number": 1,
        "activities": [
          {
            "time": "HH:MM",
            "title": "Activity name",
            "description": "Description",
            "location": {
              "name": "Location name",
              "address": "Full address",
              "lat": 0.0,
              "lng": 0.0
            },
            "duration_minutes": 120
          }
        ]
      }
    ]
  }
}

3. Only include the ITINERARY_UPDATE block if you are suggesting specific changes to the itinerary.
4. For general questions or conversation, respond naturally without the JSON block.
5. Be helpful, friendly, and provide accurate travel information.

Respond to the user's message:`;

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

    console.log("🔑 Authenticated user:", user.email);
    
    // Parse request body
    const { message, history, itinerary_context, custom_requirements }: ChatRequest =
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
      itinerary_context,
      custom_requirements
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
