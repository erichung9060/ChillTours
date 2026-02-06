import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { corsHeaders } from "../_shared/cors.ts";

interface GenerateItineraryRequest {
  destination: string;
  startDate: string;
  endDate: string;
  custom_requirements?: string;
}

/**
 * 驗證用戶是否已登入
 * 使用 Supabase Auth 的 getUser() 方法驗證 JWT
 */
async function verifyUser(
  req: Request
): Promise<{ userId: string; email: string } | null> {
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
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(jwt);

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
 * Build a structured prompt for itinerary generation
 */
function buildItineraryPrompt(
  destination: string,
  startDate: string,
  endDate: string,
  customRequirements?: string
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const duration =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  let prompt = `You are a travel planning assistant. Generate a detailed ${duration}-day travel itinerary for ${destination} starting from ${startDate} to ${endDate}.

IMPORTANT: You must respond with a valid JSON object that follows this exact structure:

{
  "title": "Trip to [Destination]",
  "destination": "${destination}",
  "days": [
    {
      "day_number": 1,
      "activities": [
        {
          "time": "HH:MM",
          "title": "Activity name",
          "description": "Detailed description",
          "location": {
            "name": "Location name",
            "lat": 0.0,
            "lng": 0.0
          },
          "duration_minutes": 120
        }
      ]
    }
  ]
}

Requirements:
- Generate exactly ${duration} days, numbered 1 to ${duration}.
- Do NOT include a "date" field in the JSON for days; only use "day_number".
- Each day should have 3-5 activities
- Include realistic times (HH:MM format in 24-hour)
- Provide accurate GPS coordinates (lat/lng) for each location
- Duration should be in minutes (typical: 60-240 minutes per activity)
- Activities should be ordered chronologically within each day
`;

  if (customRequirements) {
    prompt += `\nCustom Requirements: ${customRequirements}\n`;
  }

  prompt += `\nRespond ONLY with the JSON object, no additional text or markdown formatting.`;

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
          error: "Unauthorized. Please log in to generate itineraries.",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const {
      destination,
      startDate,
      endDate,
      custom_requirements,
    }: GenerateItineraryRequest = await req.json();

    // Validate required fields
    if (!destination || !startDate || !endDate) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: destination, startDate, or endDate",
        }),
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

    // Build prompt
    const prompt = buildItineraryPrompt(
      destination,
      startDate,
      endDate,
      custom_requirements
    );

    // Generate content with streaming
    const result = await model.generateContentStream(prompt);

    // Set up streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream chunks from Gemini
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
    console.error("Error in generate-itinerary function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
