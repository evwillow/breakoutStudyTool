/**
 * @fileoverview Custom hook wrapping NextAuth session, sign-in, and sign-out helpers.
 * @module src/web/components/Auth/hooks/useAuth.ts
 * @dependencies next-auth/react
 */
"use client";

import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { useCallback } from 'react';
import { signInWithCredentials as authSignInWithCredentials, signInWithProvider as authSignInWithProvider, signOutUser as authSignOutUser } from '@/services/auth/authService';
import { deriveAuthState } from '@/services/auth/sessionManager';

export interface UseAuthReturn {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  isAuthenticated: boolean;
  isLoading: boolean;
  isUnauthenticated: boolean;
  user: Session['user'] | null;
  signIn: (credentials: { email: string; password: string }) => Promise<{ error?: string }>;
  signInWithProvider: (provider: string, options?: Record<string, unknown>) => Promise<{ error?: string }>;
  signOut: (options?: { callbackUrl?: string }) => Promise<void>;
  update: () => Promise<Session | null>;
}

/**
 * Custom hook for authentication operations
 */
export const useAuth = (): UseAuthReturn => {
  const { data: session, status, update } = useSession();

  const authState = deriveAuthState(status, session);

  const signInWithCredentials = useCallback(async (credentials: { email: string; password: string }): Promise<{ error?: string }> => {
    try {
      const result = await authSignInWithCredentials(credentials, update);
      // Ensure we always return the expected type
      // Convert null to undefined for error field to match expected type
      if (result && 'error' in result && result.error !== null) {
        return { error: result.error };
      }
      // If successful, return empty object (no error)
      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      return { error: errorMessage };
    }
  }, [update]);

  const signOutUser = useCallback(async (options: { callbackUrl?: string } = {}): Promise<void> => {
    try {
      await authSignOutUser(options);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  const signInWithProvider = useCallback(async (provider: string, options: Record<string, unknown> = {}): Promise<{ error?: string }> => {
    try {
      const result = await authSignInWithProvider(provider, options, update);
      // Ensure we always return the expected type
      // Convert null to undefined for error field to match expected type
      if (result && 'error' in result && result.error !== null) {
        return { error: result.error };
      }
      // If successful, return empty object (no error)
      return {};
    } catch (error) {
      console.error(`Sign in with ${provider} error:`, error);
      const errorMessage = error instanceof Error ? error.message : `Unable to sign in with ${provider}`;
      return { error: errorMessage };
    }
  }, [update]);

  return {
    session,
    status,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isUnauthenticated: authState.isUnauthenticated,
    user: authState.user,
    signIn: signInWithCredentials,
    signInWithProvider,
    signOut: signOutUser,
    update
  };
};

