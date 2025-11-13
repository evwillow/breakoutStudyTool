/**
 * @fileoverview Displays accuracy feedback for user selections with score and tier labels.
 * @module src/web/components/UI/DistanceFeedback.js
 * @dependencies React
 */
/**
 * DistanceFeedback Component
 * 
 * GeoGuessr-style feedback component showing:
 * - Distance from user selection to target
 * - Accuracy score (0-100)
 * - Visual tier (Excellent, Great, Good, etc.)
 */

import React from 'react';

const DistanceFeedback = ({ distance, score, accuracyTier }) => {
  if (distance === null || distance === undefined || score === null || score === undefined) {
    return null;
  }

  return (
    <div className="bg-black bg-opacity-90 rounded-md p-4 sm:p-6 border-2 border-turquoise-400 shadow-2xl backdrop-blur-sm">
      <div className="text-center">
        {/* Main score display */}
        <div className="mb-4">
          <div className={`text-5xl sm:text-6xl font-bold ${accuracyTier?.color || 'text-white'} mb-2`}>
            {score.toFixed(1)}%
          </div>
          <div className="text-xl sm:text-2xl text-white font-semibold">
            {accuracyTier?.tier || 'Accuracy'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistanceFeedback;
