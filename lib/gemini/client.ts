/**
 * Gemini Client
 * 
 * This module provides a client for interacting with the Gemini API
 * via Next.js API Routes. It handles:
 * - Streaming responses
 * - Error handling
 * - Progressive UI updates
 * 
 * Requirements: 3.3, 3.5, 17.1, 17.3
 */

import type { Itinerary, ChatMessage } from '@/types';
import { StreamingJSONParser } from './streaming-parser';
import { parseItinerary, parseItineraryUpdate, extractJSON } from './parser';

/**
 * Error types for Gemini API
 */
export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/**
 * Options for generating an itinerary
 */
export interface GenerateItineraryOptions {
  destination: string;
  startDate: string;
  endDate: string;
  customRequirements?: string;
  userId: string;
}

/**
 * Options for chat interaction
 */
export interface ChatOptions {
  message: string;
  history: ChatMessage[];
  context: Itinerary | null;
}

/**
 * Callback for streaming chunks
 */
export type StreamingCallback = (chunk: string, partial: Partial<Itinerary> | null) => void;

/**
 * Gemini Client
 * 
 * Provides methods for interacting with Gemini API through Next.js API Routes
 */
export class GeminiClient {
  /**
   * Generate an itinerary with streaming support
   * 
   * @param options - Generation options
   * @param onChunk - Callback for each streaming chunk
   * @returns Complete parsed itinerary
   * @throws GeminiError if generation fails
   */
  async generateItinerary(
    options: GenerateItineraryOptions,
    onChunk?: StreamingCallback
  ): Promise<Itinerary> {
    const { destination, startDate, endDate, customRequirements, userId } = options;

    // Get auth token if user is logged in
    const token = await this.getAuthToken();

    const response = await fetch('/api/gemini/generate-itinerary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }), 
      },
      body: JSON.stringify({
        destination,
        startDate,
        endDate,
        custom_requirements: customRequirements,
      }),
    });

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    if (!response.body) {
      throw new GeminiError(
        'No response body received',
        'NO_RESPONSE_BODY'
      );
    }

    // Stream and parse response
    const parser = new StreamingJSONParser();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Try to parse partial JSON
        const partial = parser.appendChunk(chunk);

        // Notify callback with chunk and partial data
        if (onChunk) {
          onChunk(chunk, partial);
        }
      }

      // Parse final complete itinerary
      const finalJSON = parser.getBuffer();
      const extracted = extractJSON(finalJSON) || finalJSON;
      return parseItinerary(extracted, userId, startDate);
    } catch (error) {
      throw new GeminiError(
        `Failed to parse streaming response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PARSE_ERROR'
      );
    }
  }

  /**
   * Send a chat message with streaming support
   * 
   * @param options - Chat options
   * @param onChunk - Callback for each streaming chunk
   * @returns AI response message
   * @throws GeminiError if chat fails
   */
  async chat(
    options: ChatOptions,
    onChunk?: (chunk: string) => void
  ): Promise<{ message: string; updates?: Partial<Itinerary> }> {
    const { message, history, context } = options;

    // Get auth token if user is logged in
    const token = await this.getAuthToken();

    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        message,
        history: history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        context,
      }),
    });

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    if (!response.body) {
      throw new GeminiError(
        'No response body received',
        'NO_RESPONSE_BODY'
      );
    }

    // Stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullMessage = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullMessage += chunk;

        // Notify callback
        if (onChunk) {
          onChunk(chunk);
        }
      }

      // Check for itinerary updates in response
      const jsonContent = extractJSON(fullMessage);
      const updates = jsonContent ? parseItineraryUpdate(jsonContent) : undefined;

      return {
        message: fullMessage,
        updates,
      };
    } catch (error) {
      throw new GeminiError(
        `Failed to process chat response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHAT_ERROR'
      );
    }
  }

  /**
   * Handle error response from API
   * 
   * @param response - Fetch response
   * @returns GeminiError
   */
  private async handleErrorResponse(response: Response): Promise<GeminiError> {
    let errorMessage = `API request failed with status ${response.status}`;
    let errorCode = 'API_ERROR';

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      errorCode = errorData.code || errorCode;
    } catch {
      // Failed to parse error response, use default message
    }

    return new GeminiError(errorMessage, errorCode);
  }

  /**
   * Get authentication token from Supabase session
   * 
   * @returns Access token or null if not logged in
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // Only import Supabase client when needed (client-side only)
      if (typeof window === 'undefined') {
        return null;
      }

      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return null;
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: { session } } = await supabase.auth.getSession();

      return session?.access_token || null;
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }
}

/**
 * Default Gemini client instance
 */
export const geminiClient = new GeminiClient();
