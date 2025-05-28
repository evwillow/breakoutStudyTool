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
        await update();
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
  const signOutUser = useCallback(async (options = { redirect: false }) => {
    try {
      await signOut(options);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, []);

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