import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { corsHeaders } from "../_shared/cors.ts";

interface GenerateItineraryRequest {
  destination: string;
  duration: number;
  custom_requirements?: string;
}

/**
 * Build a structured prompt for itinerary generation
 */
function buildItineraryPrompt(
  destination: string,
  duration: number,
  customRequirements?: string
): string {
  let prompt = `You are a travel planning assistant. Generate a detailed ${duration}-day travel itinerary for ${destination}.

IMPORTANT: You must respond with a valid JSON object that follows this exact structure:

{
  "title": "Trip to [Destination]",
  "destination": "${destination}",
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "HH:MM",
          "title": "Activity name",
          "description": "Detailed description",
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

Requirements:
- Generate exactly ${duration} days
- Each day should have 3-5 activities
- Include realistic times (HH:MM format in 24-hour)
- Provide accurate GPS coordinates (lat/lng) for each location
- Include full addresses
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
    // Parse request body
    const { destination, duration, custom_requirements }: GenerateItineraryRequest =
      await req.json();

    // Validate required fields
    if (!destination || !duration) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: destination and duration" }),
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
      duration,
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
        "Connection": "keep-alive",
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
