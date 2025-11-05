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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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
        console.error('RoundHistory: Error fetching rounds:', data.error);
        throw new Error(data.error || "Failed to fetch rounds");
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
    setShowConfirmDialog(false);
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

  // Helper to format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // Mobile card view for each round
  const RoundCard = ({ round }) => {
    console.log('RoundCard rendering for round:', round.id);
    console.log('RoundCard - Accuracy:', round.accuracy, 'Type:', typeof round.accuracy);
    console.log('RoundCard - Correct Matches:', round.correctMatches, 'Type:', typeof round.correctMatches);
    console.log('RoundCard - Total Matches:', round.totalMatches, 'Type:', typeof round.totalMatches);
    
    return (
      <div className="border border-turquoise-500/30 rounded-lg p-4 mb-3 bg-black/40 backdrop-blur-sm shadow-md hover:shadow-lg hover:border-turquoise-500/50 transition-all duration-300">
        <div className="flex justify-between mb-2">
          <span className="font-medium text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-turquoise-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
            {round.dataset_name}
          </span>
          <span className="text-sm text-turquoise-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-turquoise-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            {formatDate(round.created_at)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-black/30 p-2 rounded border border-turquoise-500/20">
            <span className="text-xs text-turquoise-400">Accuracy</span>
            <p className={`font-medium text-lg ${getAccuracyColor(round.accuracy)}`}>{round.accuracy ?? '0.00'}%</p>
          </div>
          <div className="bg-black/30 p-2 rounded border border-turquoise-500/20">
            <span className="text-xs text-turquoise-400">Matches</span>
            <p className="text-turquoise-300 font-medium text-lg">{(typeof round.correctMatches === 'number' ? round.correctMatches : 0)} / {(typeof round.totalMatches === 'number' ? round.totalMatches : 0)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onLoadRound(round.id, round.dataset_name)}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-turquoise-600 to-turquoise-500 text-white text-sm rounded-md shadow-lg shadow-turquoise-500/30 hover:from-turquoise-500 hover:to-turquoise-400 transition-all flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Load
          </button>
          <button
            onClick={() => handleDeleteRound(round.id)}
            disabled={isDeleting && deletingId === round.id}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm rounded-md shadow hover:from-red-600 hover:to-red-700 transition flex items-center justify-center disabled:opacity-50"
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
        </div>
      </div>
    );
  };

  // Confirmation dialog component for delete all
  const ConfirmDialog = () => (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-70"></div>
      <div className="relative bg-black/90 backdrop-blur-md rounded-lg max-w-md w-full mx-auto p-6 shadow-2xl border-2 border-red-500/50">
        <div className="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">Delete All Rounds</h3>
          <p className="text-turquoise-300 mb-6">
            Are you sure you want to delete all of your rounds? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="px-4 py-2 bg-black/50 border border-turquoise-500/50 text-turquoise-300 rounded-md hover:bg-turquoise-500/10 hover:border-turquoise-500 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAllRounds}
              disabled={isDeletingAll}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isDeletingAll ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                "Yes, Delete All"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Desktop table view
  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-turquoise-500/20">
        <thead className="bg-transparent">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-turquoise-400 uppercase tracking-wider">Dataset</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-turquoise-400 uppercase tracking-wider">Date</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-turquoise-400 uppercase tracking-wider">Accuracy</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-turquoise-400 uppercase tracking-wider">Matches</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-turquoise-400 uppercase tracking-wider">Status</th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-turquoise-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-transparent divide-y divide-turquoise-500/20">
          {rounds.map((round) => (
            <tr key={round.id} className="hover:bg-black/40 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{round.dataset_name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-turquoise-300">{formatDate(round.created_at)}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 py-1 text-sm font-medium ${getAccuracyColor(round.accuracy)}`}>
                  {round.accuracy ?? '0.00'}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-turquoise-300">
                {(typeof round.correctMatches === 'number' ? round.correctMatches : 0)} / {(typeof round.totalMatches === 'number' ? round.totalMatches : 0)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${round.completed ? 'bg-turquoise-800/50 text-turquoise-200 border border-turquoise-500/30' : 'bg-yellow-800/50 text-yellow-200 border border-yellow-500/30'}`}>
                  {round.completed ? 'Completed' : 'In Progress'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onLoadRound(round.id, round.dataset_name)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-gradient-to-r from-turquoise-600 to-turquoise-500 hover:from-turquoise-500 hover:to-turquoise-400 shadow-lg shadow-turquoise-500/30 mr-2 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Load
                </button>
                <button
                  onClick={() => handleDeleteRound(round.id)}
                  disabled={isDeleting && deletingId === round.id}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
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
    <div className="fixed inset-0 overflow-y-auto z-50">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-70 transition-opacity"></div>
        
        <div className="relative bg-black/90 backdrop-blur-md rounded-lg shadow-xl max-w-6xl w-full mx-auto p-6 border-2 border-turquoise-500/50">
          <div className="flex justify-between items-center border-b border-turquoise-500/30 pb-4 mb-6">
            <h2 className="text-xl font-bold text-white bg-gradient-to-r from-turquoise-400 to-turquoise-300 bg-clip-text text-transparent">Your Round History</h2>
            <button
              onClick={onClose}
              className="text-turquoise-400 hover:text-turquoise-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {showConfirmDialog && <ConfirmDialog />}
          
          {loading ? (
            <div className="flex items-center justify-center w-full min-h-[400px] py-8">
              <div className="flex flex-col justify-center items-center space-y-6 p-8 bg-black rounded-xl shadow-2xl max-w-md w-full border border-white">
                <div className="relative">
                  <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-r-2 border-b-2 border-turquoise-400 border-t-transparent"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-turquoise-400 rounded-full"></div>
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-turquoise-400 to-turquoise-300 bg-clip-text text-transparent">
                    Loading History
                  </h2>
                  <p className="text-turquoise-300 text-lg font-medium">Loading your round history...</p>
                </div>
              </div>
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
            <div className="text-center py-10 bg-black/40 rounded-lg border border-turquoise-500/20 backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-turquoise-400 mb-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xl font-medium text-white mb-2">No Rounds Found</h3>
              <p className="text-turquoise-300 max-w-sm mx-auto">
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
            <div className="mt-6 pt-4 border-t border-turquoise-500/30 flex justify-between items-center">
              <p className="text-turquoise-300 text-sm">
                {rounds.length} round{rounds.length !== 1 ? 's' : ''} in total
              </p>
              <button
                onClick={() => setShowConfirmDialog(true)}
                className="flex items-center text-red-400 hover:text-red-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Clear all rounds
              </button>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-turquoise-300 border border-turquoise-500/50 rounded-md hover:bg-turquoise-500/10 hover:border-turquoise-500 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RoundHistory);