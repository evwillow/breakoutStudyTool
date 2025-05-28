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
    <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
      <p className="text-red-700 text-sm">{error}</p>
      
      {databaseError && solutions.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-semibold text-red-700">Possible solutions:</p>
          <ul className="list-disc ml-5 text-xs text-red-700 mt-1">
            {solutions.map((solution, index) => (
              <li key={index}>{solution}</li>
            ))}
            <li>
              <Link 
                href="/database-status" 
                className="underline hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
              >
                Check Database Status
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay; 