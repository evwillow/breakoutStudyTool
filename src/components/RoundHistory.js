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
const RoundHistory = ({ isOpen, onClose, onLoadRound, userId }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const fetchRounds = async () => {
    if (!isOpen || !userId) return;
    
    setLoading(true);
    try {
      // Direct fetch from the server API
      const response = await fetch(`/api/getUserRounds?userId=${userId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch rounds");
      }
      
      console.log("Received rounds data:", data.rounds);
      
      // Format the accuracy to ensure it's displayed correctly
      const formattedRounds = data.rounds.map(round => ({
        ...round,
        accuracy: parseFloat(round.accuracy).toFixed(2)
      }));
      
      setRounds(formattedRounds || []);
    } catch (err) {
      console.error("Error fetching round history:", err);
      setError("Failed to load round history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, [isOpen, userId]);

  const handleDeleteRound = async (roundId) => {
    if (confirm("Are you sure you want to delete this round?")) {
      setIsDeleting(true);
      setDeletingId(roundId);
      try {
        await fetch(`/api/deleteRound?id=${roundId}`, {
          method: 'DELETE'
        });
        // Refresh the list after deletion
        setRounds(rounds.filter(r => r.id !== roundId));
      } catch (err) {
        console.error("Error deleting round:", err);
        alert("Failed to delete round.");
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
      const response = await fetch(`/api/deleteAllRounds?userId=${userId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to delete rounds");
      }
      
      // Clear the rounds list
      setRounds([]);
      console.log("All rounds deleted successfully");
    } catch (err) {
      console.error("Error deleting all rounds:", err);
      alert("Failed to delete all rounds.");
    } finally {
      setIsDeletingAll(false);
    }
  };

  if (!isOpen) return null;

  // Get color based on accuracy
  const getAccuracyColor = (accuracy) => {
    const acc = parseFloat(accuracy);
    if (acc >= 80) return "text-green-600";
    if (acc >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Mobile card view for each round
  const RoundCard = ({ round }) => (
    <div className="border rounded-lg p-4 mb-3 bg-soft-white shadow-md hover:shadow-lg transition-shadow duration-300">
      <div className="flex justify-between mb-2">
        <span className="font-medium text-black flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>
          {round.dataset_name}
        </span>
        <span className="text-sm text-gray-600 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          {round.created_at}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-soft-gray-50 p-2 rounded">
          <span className="text-xs text-gray-500">Accuracy</span>
          <p className={`font-medium text-lg ${getAccuracyColor(round.accuracy)}`}>{round.accuracy}%</p>
        </div>
        <div className="bg-soft-gray-50 p-2 rounded">
          <span className="text-xs text-gray-500">Matches</span>
          <p className="text-black font-medium text-lg">{round.correctMatches || 0} / {round.totalMatches}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onLoadRound(round.id, round.dataset_name)}
          className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-sm rounded-md shadow hover:from-teal-600 hover:to-teal-700 transition flex items-center justify-center"
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

  // Confirmation Dialog Component
  const ConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-soft-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Confirm Deletion</h3>
        <p className="text-gray-600 mb-6">
          Are you sure you want to delete all your rounds? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowConfirmDialog(false)}
            className="px-4 py-2 bg-soft-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAllRounds}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md shadow hover:from-red-600 hover:to-red-700 transition"
          >
            Yes, Delete All
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm">
      {showConfirmDialog && <ConfirmDialog />}
      
      <div className="bg-soft-white p-4 sm:p-6 rounded-lg shadow-xl w-full sm:w-3/4 max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white bg-turquoise-600 px-4 py-2 rounded-lg shadow-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Round History
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-soft-gray-100 rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="animate-spin h-10 w-10 text-teal-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 text-lg">Loading your round history...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Rounds</h3>
              <p className="text-red-700 mt-1">{error}</p>
              <button 
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchRounds();
                }}
                className="mt-2 text-red-700 underline hover:text-red-800"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : rounds.length === 0 ? (
          <div className="text-center py-8 bg-soft-gray-50 rounded-lg border border-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-600 text-lg mb-2">No rounds found</p>
            <p className="text-gray-500">Complete a round to see your history here</p>
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
              <table className="w-full border-collapse rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-50 to-teal-100 text-gray-700">
                    <th className="border border-gray-200 p-3 text-left">Date</th>
                    <th className="border border-gray-200 p-3 text-left">Dataset</th>
                    <th className="border border-gray-200 p-3 text-left">Accuracy</th>
                    <th className="border border-gray-200 p-3 text-left">Matches</th>
                    <th className="border border-gray-200 p-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((round) => (
                    <tr key={round.id} className="hover:bg-soft-gray-50 transition-colors">
                      <td className="border border-gray-200 p-3 text-gray-700">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          {round.created_at}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3 text-gray-700">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-teal-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                          </svg>
                          {round.dataset_name}
                        </div>
                      </td>
                      <td className={`border border-gray-200 p-3 font-medium ${getAccuracyColor(round.accuracy)}`}>
                        {round.accuracy}%
                      </td>
                      <td className="border border-gray-200 p-3 text-gray-700">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {round.correctMatches || 0} / {round.totalMatches}
                        </div>
                      </td>
                      <td className="border border-gray-200 p-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => onLoadRound(round.id, round.dataset_name)}
                            className="px-3 py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-md shadow hover:from-teal-600 hover:to-teal-700 transition flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteRound(round.id)}
                            disabled={isDeleting && deletingId === round.id}
                            className="px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md shadow hover:from-red-600 hover:to-red-700 transition flex items-center disabled:opacity-50"
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        
        <div className="mt-6 flex justify-between">
          {rounds.length > 0 && (
            <button
              onClick={() => setShowConfirmDialog(true)}
              disabled={isDeletingAll}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md shadow hover:from-red-600 hover:to-red-700 transition flex items-center disabled:opacity-50"
            >
              {isDeletingAll ? (
                <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-md shadow hover:from-teal-600 hover:to-teal-700 transition flex items-center ml-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RoundHistory);