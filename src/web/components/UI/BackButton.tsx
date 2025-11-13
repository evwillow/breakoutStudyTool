'use client';

import React from 'react';

/**
 * @component BackButton
 * @overview Minimal button that triggers `window.history.back()` for client navigation.
 * @usage ```tsx
 * <BackButton />
 * ```
 * @when Place on secondary pages where users should return to the previous view via browser history.
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