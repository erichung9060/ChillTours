# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Dev server on port 3000
npm run build            # Production build
npm run lint             # ESLint
npm run format           # Prettier formatting
npm test                 # Vitest (single run)
npm run test:watch       # Vitest watch mode
npm run test:ui          # Vitest UI dashboard
npx vitest run path/to/file.test.ts  # Run a single test file
npm run supabase:gen     # Regenerate Supabase DB types
```

## Architecture

**Stack:** Next.js 16 (App Router, React 19), TypeScript (strict), Tailwind CSS v4, Supabase (DB + Auth + Edge Functions), Google Gemini 2.0 Flash for AI.

**Layered design:**
- `app/` — Next.js App Router. Routes are locale-prefixed under `app/[locale]/`. API route handlers in `app/api/` proxy requests to Supabase Edge Functions with auth.
- `components/` — React components organized by feature (`landing/`, `planner/`, `auth/`, `itineraries/`, `share/`, `layout/`). Reusable primitives in `ui/` (shadcn/ui).
- `lib/` — Core modules: `ai/` (streaming client, operation parsing), `supabase/` (client, DB queries), `maps/` (factory pattern for Google Maps / Mapbox), `places/` (resolution service), `auth/` (context provider), `theme/` (context provider), `i18n/` (navigation helpers), `utils/`.
- `hooks/` — Custom React hooks for auth, theme, chat persistence, itinerary management, permissions.
- `types/` — TypeScript types with Zod schemas for runtime validation (itinerary, chat, share, forms).
- `supabase/functions/` — Deno Edge Functions (`generate-itinerary`, `chat`, `resolve-places`). Shared code in `supabase/_shared/`.

**Key patterns:**
- AI responses stream via SSE using `@microsoft/fetch-event-source`. The AI returns structured operations (ADD/UPDATE/REMOVE/MOVE/REORDER after an `ITINERARY_OPERATIONS:` marker) that are applied granularly to itineraries.
- Map provider is swappable via factory pattern (env: `NEXT_PUBLIC_MAP_PROVIDER`).
- Real-time collaboration uses Yjs (CRDT) + y-websocket.
- State: Zustand for stores, React Context for auth/theme.
- Chat history persisted to localStorage (key: `tripai:chat:{itineraryId}`).

## i18n

Uses `next-intl`. Locales: `en` (default), `zh-TW`. Message files in `/messages/`. Use locale-aware `Link`/`useRouter` from `lib/i18n/navigation`. Config in `i18n/request.ts`.

## Testing

Vitest with jsdom, `@testing-library/react`, and `fast-check` for property-based tests. Tests live in `test/unit/` mirroring source structure. Setup/mocks in `test/setup.ts`. Path alias `@` maps to project root.

## Code Style

- Prettier: 100-char width, 2-space indent, trailing commas
- ESLint: Next.js core web vitals + TypeScript rules; underscore-prefixed unused vars are allowed
- Zod validation at all API boundaries
