/**
 * OAuth Callback Page (Simplified)
 * 
 * Supabase handles the OAuth flow automatically.
 * This page just needs to exist for the redirect.
 * 
 * Requirements: 1.1, 1.2
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase automatically handles the OAuth callback
    // and sets the session in localStorage
    
    // Just redirect to home page
    // The useAuth hook will detect the new session automatically
    router.push('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          正在完成登入...
        </p>
      </div>
    </div>
  );
}
