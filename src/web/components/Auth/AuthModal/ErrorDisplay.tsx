/**
 * @fileoverview Error display panel for auth modals with optional troubleshooting steps.
 * @module src/web/components/Auth/AuthModal/ErrorDisplay.tsx
 * @dependencies React, next/link
 */
"use client";

import React from 'react';
import Link from 'next/link';

export interface ErrorDisplayProps {
  error: string | null;
  databaseError?: boolean;
  solutions?: readonly string[];
}

/**
 * ErrorDisplay component for showing errors and solutions
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, databaseError = false, solutions = [] }) => {
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

