"use client";

/**
 * SignOutButton Component
 * 
 * Features:
 * - Dedicated sign out functionality
 * - Uses custom auth hook
 * - Consistent styling and accessibility
 * - Proper error handling
 */

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UI_TEXT } from '../utils/constants';

/**
 * SignOutButton displays a button to sign out the user
 * 
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes to apply to the button
 * @returns {JSX.Element} Sign out button
 */
const SignOutButton = ({ className = "" }) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      // Could add toast notification here
    }
  };

  return (
    <button
      onClick={handleSignOut}
      className={`px-3 py-1.5 bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white text-sm rounded-md shadow hover:from-turquoise-800 hover:to-turquoise-700 transition flex items-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-turquoise-500 ${className}`}
      aria-label="Sign out"
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
      {UI_TEXT.SIGNOUT_BUTTON}
    </button>
  );
};

export default SignOutButton; 