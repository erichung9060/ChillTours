/**
 * Authentication Hook
 * 
 * Provides authentication state and methods for the application.
 * Handles user session management, sign-in, and sign-out.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

'use client';

import { useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, signOut as supabaseSignOut } from '@/lib/supabase/client';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

interface UseAuthReturn extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Custom hook for authentication
 * 
 * Provides:
 * - Current user and session state
 * - Loading state during authentication operations
 * - Sign-in with Google OAuth
 * - Sign-out functionality
 * - Automatic session persistence and refresh
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setState(prev => ({ ...prev, error, loading: false }));
          return;
        }

        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error as AuthError,
          loading: false,
        }));
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
        
        // Note: Profile creation is handled automatically by database trigger
        // See: supabase/migrations/001_initial_schema.sql - handle_new_user()
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with Google OAuth
   * Requirements: 1.1
   */
  const signInWithGoogle = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setState(prev => ({ ...prev, error, loading: false }));
        throw error;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as AuthError,
        loading: false,
      }));
      throw error;
    }
  };

  /**
   * Sign out the current user
   * Requirements: 1.5
   */
  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Use the centralized signOut function from client.ts
      await supabaseSignOut();

      // Clear local state
      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });

      // Reload the page to clear any remaining app state
      window.location.reload();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as AuthError,
        loading: false,
      }));
      throw error;
    }
  };

  return {
    ...state,
    signInWithGoogle,
    signOut,
  };
}
