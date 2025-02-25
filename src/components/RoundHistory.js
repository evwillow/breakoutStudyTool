// /src/components/RoundHistory.js
import React, { useState, useEffect } from "react";

const RoundHistory = ({ isOpen, onClose, onLoadRound, userId }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRounds() {
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
        setRounds(data.rounds || []);
      } catch (err) {
        console.error("Error fetching round history:", err);
        setError("Failed to load round history");
      } finally {
        setLoading(false);
      }
    }
    
    fetchRounds();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-3/4 max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-black">Round History</h2>
          <button 
            onClick={onClose}
            className="text-black hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        {loading ? (
          <p className="text-black text-center py-4">Loading rounds...</p>
        ) : error ? (
          <p className="text-red-600 text-center py-4">{error}</p>
        ) : rounds.length === 0 ? (
          <p className="text-black text-center py-4">No rounds found</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left text-black">Date</th>
                <th className="border p-2 text-left text-black">Dataset</th>
                <th className="border p-2 text-left text-black">Accuracy</th>
                <th className="border p-2 text-left text-black">Matches</th>
                <th className="border p-2 text-left text-black">Status</th>
                <th className="border p-2 text-left text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round) => (
                <tr key={round.id} className="hover:bg-gray-50">
                  <td className="border p-2 text-black">{round.created_at}</td>
                  <td className="border p-2 text-black">{round.dataset_name}</td>
                  <td className="border p-2 text-black">{round.accuracy}%</td>
                  <td className="border p-2 text-black">{round.totalMatches}</td>
                  <td className="border p-2 text-black">
                    {round.completed ? "Completed" : "In Progress"}
                  </td>
                  <td className="border p-2">
                    <button
                      onClick={() => onLoadRound(round.id, round.dataset_name)}
                      className="px-3 py-1 bg-blue-100 text-black border border-black rounded shadow hover:bg-blue-200 transition mr-2"
                    >
                      Load
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this round?")) {
                          try {
                            await fetch(`/api/deleteRound?id=${round.id}`, {
                              method: 'DELETE'
                            });
                            // Refresh the list after deletion
                            setRounds(rounds.filter(r => r.id !== round.id));
                          } catch (err) {
                            console.error("Error deleting round:", err);
                            alert("Failed to delete round.");
                          }
                        }
                      }}
                      className="px-3 py-1 bg-red-100 text-black border border-black rounded shadow hover:bg-red-200 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-black border border-black rounded shadow hover:bg-gray-400 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoundHistory;