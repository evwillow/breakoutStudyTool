/**
 * @fileoverview Error display panel for auth modals with optional troubleshooting steps.
 * @module src/web/components/Auth/AuthModal/ErrorDisplay.js
 * @dependencies React, next/link
 */
/**
 * ErrorDisplay Component
 * 
 * Features:
 * - Consistent error styling
 * - Database error solutions
 * - Proper accessibility
 * - Conditional rendering
 */

import React from 'react';
import Link from 'next/link';

/**
 * ErrorDisplay component for showing errors and solutions
 * @param {Object} props - Component props
 * @returns {JSX.Element|null} Error display or null if no error
 */
const ErrorDisplay = ({ error, databaseError, solutions = [] }) => {
  if (!error) return null;

  return (
    <div className="p-3 bg-red-950/50 border border-red-800/50 rounded-md" role="alert">
      <p className="text-red-300 text-sm">{error}</p>
      
      {databaseError && solutions.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-semibold text-red-300">Possible solutions:</p>
          <ul className="list-disc ml-5 text-xs text-red-300/90 mt-1">
            {solutions.map((solution, index) => (
              <li key={index}>{solution}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay; 