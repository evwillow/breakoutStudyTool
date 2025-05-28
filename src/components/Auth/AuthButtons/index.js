"use client";

/**
 * Optimized AuthButtons Component
 * 
 * Features:
 * - Uses custom auth hook for better state management
 * - Separated sign in and sign out buttons for better maintainability
 * - Consistent styling with design system
 * - Improved accessibility
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SignInButton from './SignInButton';
import SignOutButton from './SignOutButton';

/**
 * AuthButtons component that handles user authentication UI
 * @param {Object} props - Component props
 * @param {Function} props.onSignIn - Callback function triggered when sign in is requested
 * @returns {JSX.Element} Authentication buttons based on session state
 */
const AuthButtons = ({ onSignIn }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="px-3 py-1.5 bg-gray-200 text-gray-500 text-sm rounded-md animate-pulse">
        Loading...
      </div>
    );
  }

  // Render appropriate button based on authentication state
  return isAuthenticated ? (
    <SignOutButton />
  ) : (
    <SignInButton onClick={onSignIn} />
  );
};

export default AuthButtons; 