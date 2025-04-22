'use client';

import React from 'react';

/**
 * Client component for navigating back in history
 */
export default function BackButton() {
  return (
    <button 
      onClick={() => window.history.back()}
      className="px-6 py-3 text-gray-700 font-medium bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
    >
      Go Back
    </button>
  );
} 