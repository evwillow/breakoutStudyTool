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

  const formatDistance = (dist) => {
    if (dist < 1) return `${(dist * 1000).toFixed(0)} units`;
    if (dist < 10) return `${dist.toFixed(1)} units`;
    return `${dist.toFixed(0)} units`;
  };

  return (
    <div className="bg-black bg-opacity-80 rounded-xl p-4 sm:p-6 border-2 border-turquoise-400 shadow-2xl">
      <div className="text-center">
        {/* Main score display */}
        <div className="mb-4">
          <div className={`text-5xl sm:text-6xl font-bold ${accuracyTier?.color || 'text-white'} mb-2`}>
            {accuracyTier?.emoji || '🎯'} {score.toFixed(1)}%
          </div>
          <div className="text-xl sm:text-2xl text-white font-semibold">
            {accuracyTier?.tier || 'Accuracy'}
          </div>
        </div>

        {/* Distance display */}
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="text-sm text-gray-400 uppercase tracking-wide mb-1">
            Distance
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-turquoise-400">
            {formatDistance(distance)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistanceFeedback;
