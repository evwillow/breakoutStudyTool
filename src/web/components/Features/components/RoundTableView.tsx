/**
 * @fileoverview Desktop table view component for displaying rounds.
 * @module src/web/components/Features/components/RoundTableView.tsx
 * @dependencies React, ../RoundHistory.types, ../utils/roundHistoryUtils
 */
"use client";

import React from "react";
import type { TableViewProps } from "../RoundHistory.types";
import { getAccuracyColor, formatDate, getTotalMatches } from "../utils/roundHistoryUtils";

/**
 * RoundTableView Component
 * 
 * Displays rounds in a desktop-friendly table format with:
 * - Sortable columns for name, date, accuracy, matches
 * - Delete action for each row
 * - Loading states for delete operations
 */
export const RoundTableView: React.FC<TableViewProps> = ({
  rounds,
  onLoadRound,
  onDeleteRound,
  isDeleting,
  deletingId,
}) => {
  return (
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
                {getTotalMatches(round)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onDeleteRound(round.id)}
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
};

export default RoundTableView;

