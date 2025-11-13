/**
 * @fileoverview Sign-in button component with themed styling and callback support.
 * @module src/web/components/Auth/AuthButtons/SignInButton.tsx
 * @dependencies React, ../utils/constants
 */
"use client";

import React from 'react';
import { UI_TEXT } from '../utils/constants';

export interface SignInButtonProps {
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'turquoise';
}

/**
 * SignInButton displays a button to trigger authentication
 */
const SignInButton: React.FC<SignInButtonProps> = ({ 
  onClick, 
  className = "", 
  variant = "default" 
}) => {
  const baseClasses = "px-3 py-1.5 text-sm rounded-md shadow transition inline-flex items-center justify-center whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    default: "bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-500",
    turquoise: "bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white hover:from-turquoise-800 hover:to-turquoise-700 focus:ring-turquoise-500"
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return (
    <button
      onClick={onClick}
      className={buttonClasses}
      aria-label="Sign in or sign up"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-4 w-4 mr-1.5 flex-shrink-0" 
        viewBox="0 0 20 20" 
        fill="currentColor"
        aria-hidden="true"
      >
        <path 
          fillRule="evenodd" 
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" 
          clipRule="evenodd" 
        />
      </svg>
      <span className="leading-none">{UI_TEXT.SIGNIN_SIGNUP_BUTTON}</span>
    </button>
  );
};

export default SignInButton;

