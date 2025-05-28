/**
 * FormButton Component
 * 
 * Features:
 * - Consistent button styling
 * - Loading state with spinner
 * - Proper accessibility
 * - Disabled state handling
 */

import React from 'react';

/**
 * FormButton component for consistent form buttons
 * @param {Object} props - Component props
 * @returns {JSX.Element} Form button with loading state
 */
const FormButton = ({
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
    primary: "text-white bg-turquoise-600 hover:bg-turquoise-700 focus:ring-turquoise-500 disabled:bg-turquoise-300",
    secondary: "text-turquoise-700 bg-turquoise-100 hover:bg-turquoise-200 focus:ring-turquoise-500 disabled:bg-gray-100"
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
          <svg 
            className="animate-spin h-5 w-5 mr-2 text-white" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default FormButton;