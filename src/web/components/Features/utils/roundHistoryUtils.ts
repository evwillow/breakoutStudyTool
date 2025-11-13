/**
 * @fileoverview Utility functions for RoundHistory component.
 * @module src/web/components/Features/utils/roundHistoryUtils
 */

import type { Round } from '../RoundHistory.types';

/**
 * Get color class based on accuracy value
 */
export const getAccuracyColor = (accuracy: number | string | null): string => {
  const acc = parseFloat(String(accuracy || 0));
  if (acc >= 80) return "text-turquoise-400";
  if (acc >= 60) return "text-turquoise-300";
  return "text-red-400";
};

/**
 * Format date string to locale date (date only, no time)
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Get total matches count from round
 */
export const getTotalMatches = (round: Round): number => {
  return typeof round.totalMatches === 'number' ? round.totalMatches : 0;
};

