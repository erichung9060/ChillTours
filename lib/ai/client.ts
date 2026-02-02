/**
 * AI Client
 * 
 * This module provides a client for interacting with the AI API
 * via Next.js API Routes. It handles:
 * - Streaming responses
 * - Error handling
 * - Progressive UI updates
 * 
 * Requirements: 3.3, 3.5, 17.1, 17.3
 */

import type { Itinerary, ChatMessage } from '@/types';
import { StreamingJSONParser } from './streaming-parser';
import { parseItinerary, extractJSON } from './parser';
import { parseOperations, type OperationsUpdate } from './operations';

/**
 * Error types for AI API
 */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AIError';
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
 * AI Client
 * 
 * Provides methods for interacting with AI API through Next.js API Routes
 */
export class AIClient {
  /**
   * Generate an itinerary with streaming support
   * 
   * @param options - Generation options
   * @param onChunk - Callback for each streaming chunk
   * @returns Complete parsed itinerary
   * @throws AIError if generation fails
   */
  async generateItinerary(
    options: GenerateItineraryOptions,
    onChunk?: StreamingCallback
  ): Promise<Itinerary> {
    const { destination, startDate, endDate, customRequirements, userId } = options;

    // Get auth token if user is logged in
    const token = await this.getAuthToken();

    const response = await fetch('/api/generate-itinerary', {
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
      throw new AIError(
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
      return await parseItinerary(extracted, userId, startDate);
    } catch (error) {
      throw new AIError(
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
   * @throws AIError if chat fails
   */
  async chat(
    options: ChatOptions,
    onChunk: (chunk: string) => void
  ): Promise<{ message: string; operations?: OperationsUpdate }> {
    const { message, history, context } = options;

    // Get auth token if user is logged in
    const token = await this.getAuthToken();

    const response = await fetch('/api/chat', {
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
        itinerary_context: context,
      }),
    });

    if (!response.ok) {
      throw await this.handleErrorResponse(response);
    }

    if (!response.body) {
      throw new AIError(
        'No response body received',
        'NO_RESPONSE_BODY'
      );
    }

    // Stream response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const OPERATIONS_MARKER = 'ITINERARY_OPERATIONS:';
    
    let fullResponse = '';
    let streamedUpTo = 0;
    let markerFound = false;
    let operations: OperationsUpdate | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        if (markerFound) {
          // Already found marker, just accumulate remaining content
          continue;
        }

        // Check for operations marker
        const markerIndex = fullResponse.indexOf(OPERATIONS_MARKER);
        if (markerIndex !== -1) {
          // Marker found - stream everything before it
          this.streamContent(fullResponse, streamedUpTo, markerIndex, onChunk);
          streamedUpTo = markerIndex;
          markerFound = true;
          continue;
        }

        // No marker yet - stream safe content (keep buffer for potential split marker)
        const safeUpTo = Math.max(0, fullResponse.length - OPERATIONS_MARKER.length);
        this.streamContent(fullResponse, streamedUpTo, safeUpTo, onChunk);
        streamedUpTo = safeUpTo;
      }

      // Parse operations if marker was found
      if (markerFound) {
        const markerIndex = fullResponse.indexOf(OPERATIONS_MARKER);
        const cleanMessage = fullResponse.substring(0, markerIndex).trim();
        const jsonPart = fullResponse.substring(markerIndex + OPERATIONS_MARKER.length).trim();
        
        try {
          const parsedOperations = parseOperations(JSON.parse(jsonPart));
          if (parsedOperations) {
            operations = parsedOperations;
          }
        } catch (error) {
          console.error('Failed to parse itinerary operations:', error);
        }

        console.log('ai response:', fullResponse);
        fullResponse = cleanMessage;
      } else {
        // Stream any remaining buffered content if no marker was found
        this.streamContent(fullResponse, streamedUpTo, fullResponse.length, onChunk);
      }

      return {
        message: fullResponse,
        operations,
      };
    } catch (error) {
      throw new AIError(
        `Failed to process chat response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHAT_ERROR'
      );
    }
  }

  /**
   * Stream content from startIndex to endIndex
   * Helper method to avoid code duplication
   */
  private streamContent(
    content: string,
    startIndex: number,
    endIndex: number,
    onChunk: (chunk: string) => void
  ): void {
    if (endIndex > startIndex) {
      const toStream = content.substring(startIndex, endIndex);
      onChunk(toStream);
    }
  }

  /**
   * Handle error response from API
   * 
   * @param response - Fetch response
   * @returns AIError
   */
  private async handleErrorResponse(response: Response): Promise<AIError> {
    let errorMessage = `API request failed with status ${response.status}`;
    let errorCode = 'API_ERROR';

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
      errorCode = errorData.code || errorCode;
    } catch {
      // Failed to parse error response, use default message
    }

    return new AIError(errorMessage, errorCode);
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

      // 返回用戶的 access token（這是真正的 JWT）
      return session?.access_token || null;
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }
}

/**
 * Default AI client instance
 */
export const aiClient = new AIClient();
