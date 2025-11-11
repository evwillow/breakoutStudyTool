"use client";

/**
 * Custom Authentication Hook
 * Centralizes auth logic and provides consistent interface
 */

import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback } from 'react';

/**
 * Custom hook for authentication operations
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const { data: session, status, update } = useSession();

  const isAuthenticated = status === 'authenticated' && !!session;
  const isLoading = status === 'loading';
  const isUnauthenticated = status === 'unauthenticated';

  /**
   * Sign in with credentials
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Sign in result
   */
  const signInWithCredentials = useCallback(async (credentials) => {
    try {
      const result = await signIn('credentials', {
        redirect: false,
        ...credentials
      });
      
      if (!result.error) {
        if (typeof update === 'function') {
          update().catch((err) => {
            console.error('Session refresh error:', err);
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error.message || 'Sign in failed' };
    }
  }, [update]);

  /**
   * Sign out user
   * @param {Object} options - Sign out options
   * @returns {Promise<void>}
   */
  const signOutUser = useCallback(async (options = {}) => {
    const getDefaultOrigin = () => {
      if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
      }
      if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL.replace(/\/$/, '');
      }
      return '';
    };

    const ensureAbsoluteUrl = (url) => {
      const origin = getDefaultOrigin();
      const fallback = origin ? `${origin}/` : '/';

      if (!url) {
        return fallback;
      }

      try {
        const absolute = new URL(url, origin || undefined);
        return absolute.toString();
      } catch {
        return fallback;
      }
    };

    const normalizedOptions = typeof options === 'object' && options !== null ? options : {};
    const rawCallbackUrl = normalizedOptions.callbackUrl || normalizedOptions.callbackURL;

    const finalOptions = {
      redirect: false,
      ...normalizedOptions,
      callbackUrl: ensureAbsoluteUrl(rawCallbackUrl),
    };

    const targetUrl = finalOptions.callbackUrl || '/';

    try {
      const result = await signOut(finalOptions);

      const resolvedUrl =
        typeof result === 'string'
          ? ensureAbsoluteUrl(result)
          : result && typeof result === 'object' && result.url
            ? ensureAbsoluteUrl(result.url)
            : targetUrl;

      if (typeof window !== 'undefined') {
        window.location.replace(resolvedUrl);
        window.setTimeout(() => {
          if (window.location.href !== resolvedUrl) {
            window.location.assign(resolvedUrl);
          }
        }, 100);
      }

      return result;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [update]);

  return {
    // State
    session,
    status,
    isAuthenticated,
    isLoading,
    isUnauthenticated,
    user: session?.user || null,
    
    // Methods
    signIn: signInWithCredentials,
    signOut: signOutUser,
    update
  };
}; 