/**
 * Generate Itinerary API Route
 * 
 * This route acts as a proxy layer between the frontend and Supabase Edge Function.
 * It forwards streaming requests to the Edge Function and provides a place for:
 * - Future caching mechanisms
 * - Rate limiting
 * - Request logging and analytics
 * - Error handling and monitoring
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, startDate, endDate, custom_requirements } = body;

    // Validate required fields
    if (!destination || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: destination, startDate, or endDate' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          code: 'MISSING_CONFIG'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get auth token from request header or use anon key
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || supabaseAnonKey;

    console.log('🔑 Proxying request to Edge Function');
    console.log('📍 Destination:', destination);
    console.log('📅 Dates:', startDate, 'to', endDate);

    // ✅ CORRECT: Use fetch() for streaming support
    // DO NOT use supabase.functions.invoke() - it doesn't support streaming!
    const response = await fetch(
      `${supabaseUrl}/functions/v1/generate-itinerary`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination,
          startDate,
          endDate,
          custom_requirements,
        }),
      }
    );

    console.log('📥 Edge Function response:', response.status);

    // Handle error responses
    if (!response.ok) {
      let errorMessage = `Edge Function error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // Can't parse error, use default message
      }

      console.error('❌ Error:', errorMessage);

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: 'EDGE_FUNCTION_ERROR',
          status: response.status
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Forward the streaming response
    // This maintains the streaming capability
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('❌ API route error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        code: 'API_ERROR',
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
