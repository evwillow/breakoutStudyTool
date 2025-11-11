"use client";

// /src/components/RoundHistory.js
import React, { useState, useEffect } from "react";

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
const RoundHistory = ({ isOpen, onClose, onLoadRound, userId, onRefresh }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== ROUND HISTORY: FETCHING ROUNDS ===');
      console.log('User ID:', userId);
      console.log('Fetch time:', new Date().toISOString());
      
      if (!userId) {
        console.error('RoundHistory: Missing user ID, cannot fetch rounds');
        setError("User ID not found. Please try logging in again.");
        setLoading(false);
        return;
      }

      // Add cache-busting timestamp and random parameter to ensure fresh data
      const timestamp = Date.now();
      const randomParam = Math.random().toString(36).substring(7);
      const url = `/api/game/rounds?userId=${userId}&t=${timestamp}&r=${randomParam}`;
      
      console.log('Fetching from URL:', url);
      
      const fetchResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      const data = await fetchResponse.json();
      
      console.log('Response status:', fetchResponse.status);
      console.log('Response headers:', Object.fromEntries(fetchResponse.headers.entries()));
      console.log('Received data:', data);
      
      if (!fetchResponse.ok) {
        const message =
          data?.error?.message ||
          data?.error ||
          data?.message ||
          `Unexpected response (${fetchResponse.status})`;
        console.error('RoundHistory: Error fetching rounds:', message, { data });
        throw new Error(message || "Failed to fetch rounds");
      }
      
      console.log('RoundHistory: Number of rounds found:', data.data?.length || 0);
      
      if (data.data && Array.isArray(data.data)) {
        console.log('RoundHistory: First round details:', data.data[0]);
        if (data.data[0]) {
          console.log('RoundHistory: Accuracy:', data.data[0].accuracy, 'Type:', typeof data.data[0].accuracy);
          console.log('RoundHistory: Correct Matches:', data.data[0].correctMatches, 'Type:', typeof data.data[0].correctMatches);
          console.log('RoundHistory: Total Matches:', data.data[0].totalMatches, 'Type:', typeof data.data[0].totalMatches);
        }
        setRounds(data.data);
      } else {
        console.warn('RoundHistory: No rounds array in response');
        setRounds([]);
      }
      
      console.log('=== END ROUND HISTORY FETCH ===');
    } catch (error) {
      console.error("Error fetching rounds:", error);
      setError(error.message || "Failed to load rounds. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function to parent
  useEffect(() => {
    if (onRefresh) {
      onRefresh(fetchRounds);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (isOpen) {
      console.log('RoundHistory: Modal opened, fetching fresh data...');
      console.log('Modal open time:', new Date().toISOString());
      fetchRounds();
    }
  }, [isOpen, userId]); // Always fetch when modal opens or userId changes

  const handleDeleteRound = async (roundId) => {
    if (confirm("Are you sure you want to delete this round?")) {
      setIsDeleting(true);
      setDeletingId(roundId);
      try {
        const response = await fetch(`/api/game/rounds/${roundId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || "Failed to delete round");
        }
        
        // Refresh the list after deletion
        setRounds(rounds.filter(r => r.id !== roundId));
      } catch (err) {
        console.error("Error deleting round:", err);
        alert("Failed to delete round: " + (err.message || "Unknown error"));
      } finally {
        setIsDeleting(false);
        setDeletingId(null);
      }
    }
  };

  const handleDeleteAllRounds = async () => {
    // Use browser confirm dialog instead of nested popup
    if (!confirm("Are you sure you want to delete all of your rounds? This action cannot be undone.")) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const response = await fetch(`/api/game/rounds/bulk?userId=${userId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || "Failed to delete rounds");
      }
      
      // Clear the rounds list
      setRounds([]);
      console.log("All rounds deleted successfully");
    } catch (err) {
      console.error("Error deleting all rounds:", err);
      alert("Failed to delete all rounds: " + (err.message || "Unknown error"));
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setRetryCount(prevCount => prevCount + 1);
  };

  if (!isOpen) return null;

  // Get color based on accuracy
  const getAccuracyColor = (accuracy) => {
    const acc = parseFloat(accuracy);
    if (acc >= 80) return "text-turquoise-400";
    if (acc >= 60) return "text-turquoise-300";
    return "text-red-400";
  };

  // Helper to format date (date only, no time)
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // Mobile card view for each round
  const RoundCard = ({ round }) => {
    console.log('RoundCard rendering for round:', round.id);
    console.log('RoundCard - Accuracy:', round.accuracy, 'Type:', typeof round.accuracy);
    console.log('RoundCard - Correct Matches:', round.correctMatches, 'Type:', typeof round.correctMatches);
    console.log('RoundCard - Total Matches:', round.totalMatches, 'Type:', typeof round.totalMatches);
    
    return (
      <div className="border border-white/30 rounded-md p-2.5 mb-2 bg-black/95 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-white/50 transition-all duration-300">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            {round.name ? (
              <button
                onClick={() => onLoadRound(round.id, round.dataset_name)}
                className="font-semibold text-white text-sm block hover:text-turquoise-400 transition-colors cursor-pointer text-left underline decoration-turquoise-500/50 hover:decoration-turquoise-400 truncate"
              >
                {round.name}
              </button>
            ) : (
              <button
                onClick={() => onLoadRound(round.id, round.dataset_name)}
                className="font-semibold text-white/70 text-sm block hover:text-turquoise-400 transition-colors cursor-pointer text-left italic"
              >
                Unnamed
              </button>
            )}
          </div>
          <button
            onClick={() => handleDeleteRound(round.id)}
            disabled={isDeleting && deletingId === round.id}
            className="flex-shrink-0 px-2 py-1 bg-black/95 backdrop-blur-sm border border-white/30 text-white/90 hover:text-white text-xs rounded-md shadow hover:bg-black/80 transition flex items-center justify-center disabled:opacity-50"
          >
            {isDeleting && deletingId === round.id ? (
              <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/70 mb-1.5">
          <span>{formatDate(round.created_at)}</span>
          <span className="text-white/50">•</span>
          <span className={`font-medium ${getAccuracyColor(round.accuracy)}`}>{round.accuracy ?? '0.00'}%</span>
          <span className="text-white/50">•</span>
          <span className="text-white/90">{(typeof round.totalMatches === 'number' ? round.totalMatches : 0)} matches</span>
        </div>
      </div>
    );
  };


  // Desktop table view
  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-white/20">
        <thead className="bg-transparent">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Name</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Date</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Accuracy</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">Matches</th>
            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">Delete</th>
          </tr>
        </thead>
        <tbody className="bg-transparent divide-y divide-white/20">
          {rounds.map((round) => (
            <tr key={round.id} className="hover:bg-black/40 transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-left">
                <div className="text-sm">
                  {round.name ? (
                    <button
                      onClick={() => onLoadRound(round.id, round.dataset_name)}
                      className="font-semibold text-white hover:text-turquoise-400 transition-colors cursor-pointer underline decoration-turquoise-500/50 hover:decoration-turquoise-400"
                    >
                      {round.name}
                    </button>
                  ) : (
                    <button
                      onClick={() => onLoadRound(round.id, round.dataset_name)}
                      className="font-semibold text-white/70 hover:text-turquoise-400 transition-colors cursor-pointer italic"
                    >
                      Unnamed
                    </button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-left text-sm text-white/90">{formatDate(round.created_at)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-left">
                <span className={`px-2 py-1 text-sm font-medium ${getAccuracyColor(round.accuracy)}`}>
                  {round.accuracy ?? '0.00'}%
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-left text-sm text-white/90">
                {(typeof round.totalMatches === 'number' ? round.totalMatches : 0)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => handleDeleteRound(round.id)}
                  disabled={isDeleting && deletingId === round.id}
                  className="inline-flex items-center px-3 py-1 bg-black/95 backdrop-blur-sm border border-white/30 text-white/90 hover:text-white text-xs font-medium rounded-md hover:bg-black/80 transition disabled:opacity-50"
                >
                  {isDeleting && deletingId === round.id ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Delete
                    </>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
                  <RoundCard key={round.id} round={round} />
                ))}
              </div>
              
              {/* Desktop view - table */}
              <div className="hidden sm:block">
                <TableView />
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