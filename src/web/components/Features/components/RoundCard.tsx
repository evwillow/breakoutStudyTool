/**
 * @fileoverview Mobile card view component for displaying a single round.
 * @module src/web/components/Features/components/RoundCard.tsx
 * @dependencies React, ../RoundHistory.types, ../utils/roundHistoryUtils
 */
"use client";

import React from "react";
import type { RoundCardProps } from "../RoundHistory.types";
import { getAccuracyColor, formatDate, getTotalMatches } from "../utils/roundHistoryUtils";

/**
 * RoundCard Component
 * 
 * Displays a single round in a mobile-friendly card format with:
 * - Round name (clickable to load)
 * - Date, accuracy, and match count
 * - Delete button with loading state
 */
export const RoundCard: React.FC<RoundCardProps> = ({
  round,
  onLoadRound,
  onDeleteRound,
  isDeleting,
  deletingId,
}) => {
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
          onClick={() => onDeleteRound(round.id)}
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
        <span className="text-white/90">{getTotalMatches(round)} matches</span>
      </div>
    </div>
  );
};

export default RoundCard;

