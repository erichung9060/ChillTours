/**
 * Authentication Context
 *
 * Provides centralized authentication state management using React Context.
 * This ensures a single source of truth for auth state across the application
 * and reduces duplicate Supabase auth subscriptions.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase, signOut as supabaseSignOut } from "@/lib/supabase/client";
import { Loading } from "@/components/ui/loading";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
}

interface AuthContextType extends AuthState {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 *
 * Wraps the application to provide centralized auth state.
 * Creates a single subscription to Supabase auth changes that all
 * components can access via the useAuth hook.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
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
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          setState((prev) => ({ ...prev, error, loading: false }));
          return;
        }

        setState({
          user: session?.user ?? null,
          session,
          loading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: error as AuthError,
          loading: false,
        }));
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        error: null,
      });
    });

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
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setState((prev) => ({ ...prev, error, loading: false }));
        throw error;
      }
    } catch (error) {
      setState((prev) => ({
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
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // Use the centralized signOut function from client.ts
      await supabaseSignOut();

      // Clear local state
      setState({
        user: null,
        session: null,
        loading: false,
        error: null,
      });

      router.push("/auth/login");
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error as AuthError,
        loading: false,
      }));
      throw error;
    }
  };

  const value: AuthContextType = {
    ...state,
    signInWithGoogle,
    signOut,
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loading size="lg" text="Loading..." />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 *
 * Custom hook to access authentication context.
 * Must be used within an AuthProvider.
 *
 * @returns Authentication state and methods
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
