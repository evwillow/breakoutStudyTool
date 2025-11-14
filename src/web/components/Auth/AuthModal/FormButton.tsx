/**
 * @fileoverview Reusable form button with loading and variant styling for auth modals.
 * @module src/web/components/Auth/AuthModal/FormButton.tsx
 * @dependencies React
 */
"use client";

import React from 'react';
import { LoadingSpinner } from '@/components/UI/LoadingSpinner';

export interface FormButtonProps {
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

/**
 * FormButton component for consistent form buttons
 */
const FormButton: React.FC<FormButtonProps> = ({
  type = 'button',
  disabled = false,
  isLoading = false,
  className = '',
  children,
  onClick,
  variant = 'primary'
}) => {
  const baseClasses = "flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantClasses = {
    primary: "text-white bg-turquoise-600 hover:bg-turquoise-500 focus:ring-turquoise-500 disabled:bg-turquoise-800 disabled:text-turquoise-400 disabled:cursor-not-allowed",
    secondary: "text-turquoise-300 bg-turquoise-900/50 hover:bg-turquoise-800/50 focus:ring-turquoise-500 disabled:bg-turquoise-950 disabled:text-turquoise-600 disabled:cursor-not-allowed"
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${disabled || isLoading ? 'disabled:cursor-not-allowed' : ''} ${className}`;

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={buttonClasses}
      onClick={onClick}
      aria-disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default FormButton;

