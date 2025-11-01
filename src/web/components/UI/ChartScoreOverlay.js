"use client";

/**
 * ChartScoreOverlay Component
 * 
 * Faded overlay that appears above the chart showing the score after selection
 * Includes auto-progression and manual "Next" button
 */

import React, { useEffect, useState } from 'react';

const ChartScoreOverlay = ({ score, accuracyTier, show, onNext, autoProgressDelay = 2500 }) => {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!show || !onNext) return;
    
    // Start countdown for auto-progression
    const remaining = Math.ceil(autoProgressDelay / 1000);
    setCountdown(remaining);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    const timeout = setTimeout(() => {
      onNext();
    }, autoProgressDelay);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [show, onNext, autoProgressDelay]);

  if (!show || score === null || score === undefined) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-lg pointer-events-auto transition-opacity duration-300">
      <div className="text-center px-4">
        <div className={`text-4xl sm:text-6xl md:text-7xl font-bold ${accuracyTier?.color || 'text-white'} mb-2 sm:mb-3 drop-shadow-2xl animate-pulse`}>
          {score.toFixed(1)}%
        </div>
        <div className="text-lg sm:text-xl md:text-2xl text-white font-semibold drop-shadow-lg mb-4 sm:mb-6">
          {accuracyTier?.tier || 'Accuracy'}
        </div>
        
        {onNext && (
          <div className="flex flex-col items-center gap-3">
            {countdown !== null && countdown > 0 && (
              <p className="text-sm sm:text-base text-gray-300">
                Next in {countdown}...
              </p>
            )}
            <button
              onClick={onNext}
              className="px-6 sm:px-8 py-2 sm:py-3 bg-turquoise-500 hover:bg-turquoise-600 text-white font-bold rounded-lg shadow-lg transition-all duration-200 active:scale-95 text-sm sm:text-base"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartScoreOverlay;
