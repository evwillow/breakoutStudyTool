/**
 * @fileoverview Hook that redirects authenticated users away from public routes and handles return paths.
 * @module src/web/lib/hooks/useAuthRedirect.ts
 * @dependencies next/navigation, next-auth/react
 */
import { useEffect } from 'react';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

/**
 * Helper to check for session cookie synchronously
 */
function hasSessionCookieSync(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const cookies = document.cookie.split(';');
    return cookies.some(cookie => {
      const trimmed = cookie.trim();
      return trimmed.startsWith('next-auth.session-token=') || 
             trimmed.startsWith('__Secure-next-auth.session-token=');
    });
  } catch {
    return false;
  }
}

/**
 * Custom hook for handling authentication redirects
 * 
 * Automatically redirects unauthenticated users to the home page
 * and provides loading and session states for components.
 * Uses optimistic session checking to prevent blocking loading states.
 * 
 * @returns Object containing session data, loading state, and authentication status
 */
export const useAuthRedirect = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Check for session cookie immediately (synchronously) to prevent delay
  const hasSessionCookie = typeof window !== 'undefined' ? hasSessionCookieSync() : false;
  
  // Only redirect if truly unauthenticated (no session AND no cookie)
  useEffect(() => {
    if (status === "unauthenticated" && !hasSessionCookie) {
      router.push("/");
    }
  }, [status, router, hasSessionCookie]);

  // Use optimistic loading - if we have a cookie, don't block rendering
  const isLoading = status === "loading" && !hasSessionCookie;
  const isAuthenticated = status === "authenticated" || (hasSessionCookie && status === "loading");

  return { 
    session: session || (hasSessionCookie ? { user: { name: '', email: '' } } : null), 
    status, 
    isLoading,
    isAuthenticated
  };
}; 