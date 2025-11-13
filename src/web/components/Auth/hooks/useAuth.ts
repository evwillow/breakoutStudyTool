/**
 * @fileoverview Custom hook wrapping NextAuth session, sign-in, and sign-out helpers.
 * @module src/web/components/Auth/hooks/useAuth.ts
 * @dependencies next-auth/react
 */
"use client";

import { useSession, type Session } from 'next-auth/react';
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

  const signInWithCredentials = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      return await authSignInWithCredentials(credentials, update);
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      return { error: errorMessage };
    }
  }, [update]);

  const signOutUser = useCallback(async (options: { callbackUrl?: string } = {}) => {
    try {
      return await authSignOutUser(options);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, []);

  const signInWithProvider = useCallback(async (provider: string, options: Record<string, unknown> = {}) => {
    try {
      return await authSignInWithProvider(provider, options, update);
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

