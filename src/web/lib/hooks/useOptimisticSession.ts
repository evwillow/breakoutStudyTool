/**
 * @fileoverview Hook that provides optimistic session state by checking cookies immediately.
 * @module src/web/lib/hooks/useOptimisticSession.ts
 * @dependencies next-auth/react
 */
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Custom hook that provides optimistic session state
 * Checks for session cookie immediately to prevent sign-out/sign-in flash
 */
// Helper to check for session cookie synchronously
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

export function useOptimisticSession() {
  const { data: session, status } = useSession();
  // Check for session cookie immediately (synchronously) to prevent any delay
  const hasSessionCookie = typeof window !== 'undefined' ? hasSessionCookieSync() : false;

  // If we have a session cookie but status is still loading, assume authenticated
  // This prevents the sign-out/sign-in flash on page refresh
  const optimisticStatus = hasSessionCookie === true && status === "loading" 
    ? "authenticated" 
    : status;

  // If we have a session cookie, assume we're authenticated even if session hasn't loaded yet
  const isAuthenticated = status === "authenticated" || (hasSessionCookie === true && status === "loading");

  return {
    data: session,
    status: optimisticStatus,
    isAuthenticated,
    isLoading: status === "loading" && !hasSessionCookie,
  };
}

