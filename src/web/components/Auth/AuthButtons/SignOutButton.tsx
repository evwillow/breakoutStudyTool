/**
 * @fileoverview Sign-out button component leveraging the custom auth hook.
 * @module src/web/components/Auth/AuthButtons/SignOutButton.tsx
 * @dependencies React, ../hooks/useAuth, ../utils/constants
 */
"use client";

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UI_TEXT } from '../utils/constants';

export interface SignOutButtonProps {
  className?: string;
}

/**
 * SignOutButton displays a button to sign out the user
 */
const SignOutButton: React.FC<SignOutButtonProps> = ({ className = "" }) => {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
    }
  };

  const buttonLabel = isSigningOut ? 'Signing out…' : UI_TEXT.SIGNOUT_BUTTON;

  return (
    <button
      onClick={handleSignOut}
      disabled={isSigningOut}
      aria-label="Sign out"
      aria-busy={isSigningOut}
      className={`px-3 py-1.5 bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white text-sm rounded-md shadow transition flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-turquoise-500 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 mr-1.5" 
        viewBox="0 0 20 20" 
        fill="currentColor"
        aria-hidden="true"
      >
        <path 
          fillRule="evenodd" 
          d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414l-5-5H3zM2 4a2 2 0 012-2h5.586a1 1 0 01.707.293l6 6a1 1 0 01.293.707V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" 
          clipRule="evenodd" 
        />
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
      {buttonLabel}
    </button>
  );
};

export default SignOutButton;

