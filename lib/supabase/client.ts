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
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
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
 * Type-safe helper for getting the current user
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting current user:", error);
    return null;
  }

  return user;
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
    console.error("Error getting current session:", error);
    return null;
  }

  return session;
}

/**
 * Sign out the current user
 * Requirements: 1.5
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Error signing out:", error);
    throw error;
  }

  // Clear session storage (chat history, etc.)
  sessionStorage.clear();
}
