/**
 * @fileoverview Auth buttons wrapper that toggles between sign-in and sign-out states.
 * @module src/web/components/Auth/AuthButtons/index.tsx
 * @dependencies React, ../hooks/useAuth, ./SignInButton, ./SignOutButton
 */
"use client";

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SignInButton from './SignInButton';
import SignOutButton from './SignOutButton';

export interface AuthButtonsProps {
  onSignIn?: () => void;
}

/**
 * AuthButtons component that handles user authentication UI
 */
const AuthButtons: React.FC<AuthButtonsProps> = ({ onSignIn }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="px-3 py-1.5 bg-gray-200 text-gray-500 text-sm rounded-md animate-pulse">
        Loading...
      </div>
    );
  }

  return isAuthenticated ? (
    <SignOutButton />
  ) : (
    <SignInButton onClick={onSignIn} />
  );
};

export default AuthButtons;

