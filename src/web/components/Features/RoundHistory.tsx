/**
 * @fileoverview Modal for browsing, loading, and managing user round history.
 * @module src/web/components/Features/RoundHistory.tsx
 * @dependencies React, hooks, components
 */
"use client";

import React from "react";
import { useRoundHistory } from "./hooks/useRoundHistory";
import { RoundCard, RoundTableView } from "./components";
import type { RoundHistoryProps } from "./RoundHistory.types";

/**
 * RoundHistory Component
 * 
 * Displays a modal with the user's round history, allowing them to:
 * - View past rounds with detailed statistics
 * - Load a previous round to continue or review
 * - Delete rounds they no longer want to keep
 * - Clear all rounds at once
 * 
 * Features:
 * - Responsive design with different layouts for mobile and desktop
 * - Loading states with animated spinner
 * - Error handling with user-friendly messages
 * - Confirmation dialogs for destructive actions
 * - Visual indicators for round status and performance
 * - Turquoise theme consistent with the rest of the application
 */
const RoundHistory: React.FC<RoundHistoryProps> = ({ isOpen, onClose, onLoadRound, userId, onRefresh }) => {
  const {
    rounds,
    loading,
    error,
    isDeleting,
    deletingId,
    isDeletingAll,
    handleDeleteRound,
    handleDeleteAllRounds,
    handleRetry,
  } = useRoundHistory({
    userId,
    isOpen,
    onRefresh,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 overflow-y-auto z-[60]">
      <div className="flex items-center justify-center min-h-screen px-4 py-8 sm:py-12">
        <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity"></div>
        
        <div className="relative bg-black/95 backdrop-blur-sm rounded-md shadow-xl max-w-4xl w-full mx-auto p-4 sm:p-6 border border-white/30">
          {/* Decorative gradient overlay - faint turquoise */}
          <div className="absolute inset-0 bg-gradient-to-br from-turquoise-500/5 via-transparent to-transparent pointer-events-none rounded-md"></div>
          
          <div className="relative z-10 flex justify-between items-center border-b border-white/30 pb-4 mb-6">
            <h2 className="text-xl font-semibold text-white">Round History</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center w-full min-h-[400px] py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-turquoise-400 border-t-transparent"></div>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-700/50 rounded-md p-4 flex items-start backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-red-200 font-medium">Error Loading Rounds</h3>
                <p className="text-red-300 mt-1">{error}</p>
                <button 
                  onClick={handleRetry}
                  className="mt-2 text-turquoise-300 underline hover:text-turquoise-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : rounds.length === 0 ? (
            <div className="text-center py-10 bg-black/95 backdrop-blur-sm rounded-md border border-white/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-white/70 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xl font-semibold text-white mb-2">No Rounds Found</h3>
              <p className="text-white/70 max-w-sm mx-auto">
                You haven't started any rounds yet. Select a dataset and start practicing to see your history here.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile view - cards */}
              <div className="sm:hidden space-y-4">
                {rounds.map(round => (
                  <RoundCard
                    key={round.id}
                    round={round}
                    onLoadRound={onLoadRound}
                    onDeleteRound={handleDeleteRound}
                    isDeleting={isDeleting}
                    deletingId={deletingId}
                  />
                ))}
              </div>
              
              {/* Desktop view - table */}
              <div className="hidden sm:block">
                <RoundTableView
                  rounds={rounds}
                  onLoadRound={onLoadRound}
                  onDeleteRound={handleDeleteRound}
                  isDeleting={isDeleting}
                  deletingId={deletingId}
                />
              </div>
            </>
          )}
          
          {rounds.length > 0 && (
            <div className="mt-6 pt-4 border-t border-white/30 flex justify-between items-center">
              <p className="text-white/70 text-sm">
                {rounds.length} round{rounds.length !== 1 ? 's' : ''} in total
              </p>
              <button
                onClick={handleDeleteAllRounds}
                disabled={isDeletingAll}
                className="flex items-center text-white/70 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Clear all rounds
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default React.memo(RoundHistory);
