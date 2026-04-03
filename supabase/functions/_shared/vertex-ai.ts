import { GoogleGenAI } from "npm:@google/genai";

// ── Configuration ─────────────────────────────────────────────────────

export const VERTEX_CONFIG = {
  ITINERARY_MODEL: Deno.env.get("ITINERARY_MODEL"),
  CHAT_MODEL: Deno.env.get("CHAT_MODEL"),
};

// ── SDK Client (singleton) ────────────────────────────────────────────

let _aiClient: GoogleGenAI | null = null;

/**
 * Get @google/genai SDK client.
 * Authenticates via Vertex AI Express Mode API Key.
 */
export function getAIClient(): GoogleGenAI {
  if (!_aiClient) {
    _aiClient = new GoogleGenAI({
      apiKey: Deno.env.get("VERTEX_API_KEY")!,
      vertexai: true,
    });
  }
  return _aiClient;
}
