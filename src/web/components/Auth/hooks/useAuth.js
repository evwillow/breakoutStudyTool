/**
 * @fileoverview Custom hook wrapping NextAuth session, sign-in, and sign-out helpers.
 * @module src/web/components/Auth/hooks/useAuth.js
 * @dependencies next-auth/react
 */
"use client";

/**
 * Custom Authentication Hook
 * Centralizes auth logic and provides consistent interface
 */

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import { signInWithCredentials as authSignInWithCredentials, signInWithProvider as authSignInWithProvider, signOutUser as authSignOutUser } from '@/services/auth/authService';
import { deriveAuthState } from '@/services/auth/sessionManager';

/**
 * Custom hook for authentication operations
 * @returns {Object} Auth state and methods
 */
export const useAuth = () => {
  const { data: session, status, update } = useSession();

  const authState = deriveAuthState(status, session);

  /**
   * Sign in with credentials
   * @param {Object} credentials - User credentials
   * @returns {Promise<Object>} Sign in result
   */
  const signInWithCredentials = useCallback(async (credentials) => {
    try {
      return await authSignInWithCredentials(credentials, update);
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error.message || 'Sign in failed' };
    }
  }, []);

  /**
   * Sign out user
   * @param {Object} options - Sign out options
   * @returns {Promise<void>}
   */
  const signOutUser = useCallback(async (options = {}) => {
    try {
      return await authSignOutUser(options);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }, [update]);

  const signInWithProvider = useCallback(async (provider, options = {}) => {
    try {
      return await authSignInWithProvider(provider, options, update);
    } catch (error) {
      console.error(`Sign in with ${provider} error:`, error);
      return { error: error.message || `Unable to sign in with ${provider}` };
    }
  }, [update]);

  return {
    // State
    session,
    status,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    isUnauthenticated: authState.isUnauthenticated,
    user: authState.user,
    
    // Methods
    signIn: signInWithCredentials,
    signInWithProvider,
    signOut: signOutUser,
    update
  };
}; 