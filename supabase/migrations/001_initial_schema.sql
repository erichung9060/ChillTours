-- TripAI Travel Planner Database Schema
-- Migration 001: Initial Schema Setup

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
-- Extended user profile data (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster profile lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_tier ON profiles(tier);

-- ============================================================================
-- ITINERARIES TABLE
-- ============================================================================
-- Stores travel itineraries with full data in JSONB
CREATE TABLE itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  data JSONB NOT NULL,  -- Full itinerary structure (days, activities, locations)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT valid_title CHECK (char_length(title) > 0),
  CONSTRAINT valid_destination CHECK (char_length(destination) > 0)
);

-- Indexes for performance
CREATE INDEX idx_itineraries_user_id ON itineraries(user_id);
CREATE INDEX idx_itineraries_created_at ON itineraries(created_at DESC);
CREATE INDEX idx_itineraries_destination ON itineraries(destination);

-- ============================================================================
-- ITINERARY SHARES TABLE
-- ============================================================================
-- Manages collaborative access to itineraries
CREATE TABLE itinerary_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission TEXT DEFAULT 'edit' CHECK (permission IN ('view', 'edit')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(itinerary_id, shared_with_user_id)
);

-- Indexes for faster share lookups
CREATE INDEX idx_shares_itinerary_id ON itinerary_shares(itinerary_id);
CREATE INDEX idx_shares_user_id ON itinerary_shares(shared_with_user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_shares ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- ITINERARIES POLICIES
-- -----------------------------------------------------------------------------

-- Users can view their own itineraries
CREATE POLICY "Users can view own itineraries"
  ON itineraries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view shared itineraries
CREATE POLICY "Users can view shared itineraries"
  ON itineraries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_shares
      WHERE itinerary_id = itineraries.id
      AND shared_with_user_id = auth.uid()
    )
  );

-- Users can insert their own itineraries
CREATE POLICY "Users can create itineraries"
  ON itineraries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own itineraries
CREATE POLICY "Users can update own itineraries"
  ON itineraries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can update shared itineraries with edit permission
CREATE POLICY "Users can update shared itineraries"
  ON itineraries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_shares
      WHERE itinerary_id = itineraries.id
      AND shared_with_user_id = auth.uid()
      AND permission = 'edit'
    )
  );

-- Users can delete their own itineraries
CREATE POLICY "Users can delete own itineraries"
  ON itineraries FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- ITINERARY SHARES POLICIES
-- -----------------------------------------------------------------------------

-- Users can view shares for their own itineraries
CREATE POLICY "Users can view shares for own itineraries"
  ON itinerary_shares FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_shares.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- Users can view shares where they are the shared user
CREATE POLICY "Users can view their own shares"
  ON itinerary_shares FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- Users can create shares for their own itineraries
CREATE POLICY "Users can create shares for own itineraries"
  ON itinerary_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_shares.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- Users can delete shares for their own itineraries
CREATE POLICY "Users can delete shares for own itineraries"
  ON itinerary_shares FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM itineraries
      WHERE itineraries.id = itinerary_shares.itinerary_id
      AND itineraries.user_id = auth.uid()
    )
  );

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Free Tier Limit Enforcement
-- -----------------------------------------------------------------------------
-- Prevents free users from creating more than 3 itineraries
CREATE OR REPLACE FUNCTION check_itinerary_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user is on free tier
  IF (
    SELECT tier FROM profiles WHERE id = NEW.user_id
  ) = 'free' THEN
    -- Count existing itineraries
    IF (
      SELECT COUNT(*) FROM itineraries WHERE user_id = NEW.user_id
    ) >= 3 THEN
      RAISE EXCEPTION 'Free tier users can only create 3 itineraries. Upgrade to Pro for unlimited itineraries.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_itinerary_limit
  BEFORE INSERT ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION check_itinerary_limit();

-- -----------------------------------------------------------------------------
-- Updated At Timestamp Trigger
-- -----------------------------------------------------------------------------
-- Automatically updates the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Auto-create Profile on User Signup
-- -----------------------------------------------------------------------------
-- Automatically creates a profile when a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Enable Realtime for itineraries table (for collaboration)
ALTER PUBLICATION supabase_realtime ADD TABLE itineraries;

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- No initial data needed for production
-- Test data can be added in separate seed files

