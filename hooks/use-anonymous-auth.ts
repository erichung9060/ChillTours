import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Ensures the user has a valid session (real or anonymous).
 * Used on pages that allow unauthenticated access via link share.
 *
 * Returns true when auth is ready (session exists or anonymous sign-in completed).
 */
export function useAnonymousAuth(): boolean {
  const { user, loading } = useAuth();
  const [anonSignInDone, setAnonSignInDone] = useState(false);

  useEffect(() => {
    if (loading || user) return;

    supabase.auth
      .signInAnonymously()
      .catch(() => {
        // Even on failure, unblock the page — the itinerary fetch will
        // return an access error if the content is not publicly accessible.
      })
      .finally(() => {
        setAnonSignInDone(true);
      });
  }, [user, loading]);

  return (!loading && !!user) || anonSignInDone;
}
