# Supabase Backend Setup

This directory contains the Supabase database migrations for the TripAI Travel Planner.

## Prerequisites

- Supabase Account: Sign up at [supabase.com](https://supabase.com)
- Supabase CLI (optional): For managing migrations

## Setup Instructions

### 1. Create/Access Your Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project or create a new one

### 2. Run the Database Migration

**Option A: Using SQL Editor (Recommended)**

1. Go to SQL Editor in your Supabase dashboard
2. Click "New query"
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste and run the SQL

**Option B: Using Supabase CLI**

```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 3. Configure Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Get these values from: Settings > API in your Supabase dashboard

### 4. Configure Google OAuth

1. Go to Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials (Client ID & Secret)
4. Add authorized redirect URLs:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`

### 5. Enable Realtime (for collaboration)

1. Go to Database > Replication
2. Enable replication for the `itineraries` table

## Database Schema

### Tables

- **profiles**: User profiles with tier management (free/pro)
- **itineraries**: Travel itineraries with JSONB data
- **itinerary_shares**: Collaborative access management

### Security Features

- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Users can only access their own data
- ✅ Shared itineraries respect permission levels
- ✅ Free tier limit enforced (max 3 itineraries)

### Triggers

- **Free Tier Limit**: Prevents free users from creating >3 itineraries
- **Auto Profile Creation**: Creates profile on user signup
- **Updated Timestamps**: Automatically updates `updated_at` fields

## Verification

After setup, verify by:

1. Checking Database > Tables for the 3 tables
2. Checking Database > Policies for RLS policies
3. Running tests: `npm run test`

## Google OAuth Setup

1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Google+ API
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URIs
5. Add Client ID and Secret to Supabase dashboard

## Troubleshooting

### Migration Errors

- Ensure PostgreSQL version matches (check Settings > General)
- Verify auth.users table exists (created by Supabase)

### RLS Issues

- Test policies in SQL Editor
- Check Supabase logs for policy violations

### Realtime Not Working

- Verify replication is enabled
- Check RLS policies allow SELECT
- Ensure WebSocket connections aren't blocked

## Security Notes

- ✅ Anon key is safe to expose (protected by RLS)
- ❌ Never expose service_role key in frontend
- ✅ Configure domain restrictions in dashboard
- ✅ Keep `.env.local` in `.gitignore`
