/**
 * @fileoverview Data loading state component for flashcard container.
 * @module src/web/components/Flashcards/components/DataLoadingState.tsx
 * @dependencies React, ./LoadingStates
 */
"use client";

import React from "react";
import { LoadingStates } from "./LoadingStates";

export interface DataLoadingStateProps {
  /** Loading progress (0-100) */
  loadingProgress?: number;
  /** Current loading step description */
  loadingStep?: string;
  /** Selected folder name */
  selectedFolder?: string | null;
  /** Whether data is currently loading */
  loading?: boolean;
  /** Error message if loading failed */
  error?: string | null;
  /** Whether session is authenticated */
  isAuthenticated?: boolean;
}

/**
 * DataLoadingState Component
 * Unified loading state display for flashcard data loading
 */
export const DataLoadingState: React.FC<DataLoadingStateProps> = ({
  loadingProgress,
  loadingStep,
  selectedFolder,
  loading = false,
  error = null,
  isAuthenticated = true,
}) => {
  // Show loading screen with black background overlay
  return (
    <>
      {/* Black background overlay covering entire page */}
      <div 
        className="fixed inset-0 bg-black z-40 pointer-events-none transition-opacity duration-300 ease-in-out" 
        style={{ pointerEvents: 'none', opacity: 1 }} 
      />
      <div 
        className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none transition-opacity duration-300 ease-in-out" 
        style={{ pointerEvents: 'none', opacity: 1 }}
      >
        <LoadingStates.DataLoading 
          progress={loadingProgress ? loadingProgress / 100 : undefined}
          step={loadingStep}
          folder={selectedFolder}
        />
      </div>
    </>
  );
};

export default DataLoadingState;

