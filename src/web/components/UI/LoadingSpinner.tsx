/**
 * @fileoverview Simple green loading circle spinner component.
 * @module src/web/components/UI/LoadingSpinner.tsx
 * @dependencies React
 */
"use client";

import React from 'react';

export interface LoadingSpinnerProps {
  /** Size of the spinner (default: 'md') */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Simple green loading circle spinner
 * Used consistently across the entire application
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-[3px]',
    xl: 'h-20 w-20 border-4'
  };

  return (
    <div 
      className={`animate-spin rounded-full border-green-400 border-t-transparent ${sizeClasses[size]} ${className}`}
      aria-label="Loading"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;

