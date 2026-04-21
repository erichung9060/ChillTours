/**
 * Supabase Client Configuration
 *
 * This module provides a configured Supabase client for use throughout the application.
 * It handles authentication, database queries, and real-time subscriptions.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Please check your .env.local file.");
}

/**
 * Supabase client instance
 *
 * This client is configured with:
 * - Type-safe database schema
 * - Automatic session management
 * - Row Level Security (RLS) enforcement
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Type-safe helper for getting the current user.
 *
 * Reads from the locally-cached session (no network call) to avoid
 * AuthSessionMissingError when called without an active session.
 * RLS on the server validates the JWT independently, so this is safe
 * for client-side permission checks.
 */
export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/**
 * Type-safe helper for getting the current session
 */
export async function getCurrentSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getCurrentSession();
  return session?.access_token ?? null;
}

/**
 * Sign out the current user
 * Requirements: 1.5
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }

  // Clear session storage (chat history, etc.)
  sessionStorage.clear();
}

export async function handleAuthCallback(code: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data;
}
