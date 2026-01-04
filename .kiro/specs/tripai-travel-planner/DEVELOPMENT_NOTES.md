# TripAI Travel Planner - Development Notes

## Architecture Decisions

### Backend Infrastructure: Supabase Cloud Service

**Decision Date:** 2025-01-02

**Context:**
This project uses **Supabase's hosted cloud service** (not self-hosted Supabase). This is an important architectural decision that affects how we implement authentication and other features.

**Supabase Cloud URL:**
```
https://rkxowkdqkplsqhxivynl.supabase.co
```

---

### Critical: Edge Function Streaming Implementation

**Decision Date:** 2025-01-03

**Context:**
When implementing frontend components that call Supabase Edge Functions with streaming responses (e.g., AI-generated itineraries), we discovered that the standard Supabase client method does NOT support streaming.

**❌ WRONG Approach:**
```typescript
// This does NOT support streaming!
const { data, error } = await supabase.functions.invoke(
  'generate-itinerary',
  { body: { destination, duration } }
);
// Waits for complete response, no progressive updates
```

**✅ CORRECT Approach:**
```typescript
// Direct URL invocation with fetch() for streaming support
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const { data: { session } } = await supabase.auth.getSession();

const response = await fetch(
  `${supabaseUrl}/functions/v1/generate-itinerary`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || anonKey}`,
    },
    body: JSON.stringify({ destination, duration }),
  }
);

// Read streaming response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value, { stream: true });
  // Process chunk for progressive UI updates
}
```

**Key Requirements:**
1. **Use direct URL**: `${supabaseUrl}/functions/v1/{function-name}`
2. **Include Authorization header**: `Bearer ${token}`
3. **Use session token when available**: `session.access_token`
4. **Fallback to anon key**: For unauthenticated requests
5. **Read response.body as stream**: Use ReadableStream API

**Authentication Token Priority:**
1. User session token (if logged in) - Recommended
2. Supabase anon key (for public access)

**Why This Matters:**
- Enables real-time progressive UI updates
- Better user experience (see results as they generate)
- Essential for AI streaming responses
- Prevents timeout on long-running operations

**Affected Components:**
- TripForm (itinerary generation)
- ChatPanel (AI conversations)
- Any component calling Edge Functions with streaming

**Reference Implementation:**
See `app/test-streaming/page.tsx` for complete working example.

---
