/**
 * Chat API Route
 * 
 * This route acts as a proxy layer between the frontend and Supabase Edge Function.
 * It forwards streaming requests to the Edge Function and provides a place for:
 * - Future caching mechanisms
 * - Rate limiting
 * - Request logging and analytics
 * - Error handling and monitoring
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, context } = body;

    // Validate required fields
    if (!message) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required field: message' 
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

    // 從請求中獲取用戶的 session token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized. Please log in to use this feature.',
          code: 'UNAUTHORIZED'
        }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('🔑 Proxying chat request to Edge Function');
    console.log('💬 Message:', message.substring(0, 50) + '...');

    // ✅ CORRECT: Use fetch() for streaming support
    // DO NOT use supabase.functions.invoke() - it doesn't support streaming!
    const response = await fetch(
      `${supabaseUrl}/functions/v1/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          message,
          history: history || [],
          context,
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
