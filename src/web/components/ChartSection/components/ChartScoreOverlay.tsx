/**
 * @fileoverview Score overlay component displaying accuracy results and countdown timer.
 * @module src/web/components/ChartSection/components/ChartScoreOverlay.tsx
 * @dependencies React
 */
"use client";

import React, { useState, useEffect, useRef } from "react";
import type { ChartScoreOverlayProps } from "../ChartSection.types";

/**
 * ChartScoreOverlay Component
 * Displays score, accuracy tier, countdown timer, and next button after user makes a prediction
 */
export const ChartScoreOverlay: React.FC<ChartScoreOverlayProps> = ({ 
  score, 
  accuracyTier, 
  show, 
  onNext, 
  isMobile = false, 
  alwaysPaused = false, 
  onPauseChange = null 
}) => {
  const [countdown, setCountdown] = useState<number>(10);
  const [isPaused, setIsPaused] = useState<boolean>(alwaysPaused);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef<boolean>(alwaysPaused);
  const onNextRef = useRef<(() => void) | null>(onNext);
  
  // Keep onNext ref up to date
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  
  // Reset countdown when popup appears
  useEffect(() => {
    if (!show || score === null || score === undefined) {
      return;
    }
    
    setCountdown(10);
    setIsPaused(alwaysPaused);
    isPausedRef.current = alwaysPaused;
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [show, score, alwaysPaused]);
  
  // Countdown timer - only runs when not paused and not always paused
  useEffect(() => {
    if (!show || score === null || score === undefined || isPaused || alwaysPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (!isPausedRef.current && !alwaysPaused && onNextRef.current) {
            // Dispatch event for tutorial to detect score timer completion
            window.dispatchEvent(new CustomEvent('tutorial-score-timer-complete'));
            onNextRef.current();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [show, score, isPaused, alwaysPaused]);
  
  // Handle pause toggle
  const handlePauseToggle = (): void => {
    setIsPaused((prev: boolean) => {
      const newPaused = !prev;
      isPausedRef.current = newPaused;
      if (newPaused && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (onPauseChange) {
        onPauseChange(newPaused);
      }
      return newPaused;
    });
  };
  
  if (!show || score === null || score === undefined) {
    return null;
  }

  return (
    <div className={`absolute z-50 pointer-events-none ${
      isMobile 
        ? 'bottom-0 left-2 right-2' 
        : 'bottom-0 left-2 right-2'
    }`}>
      <div className={`bg-black/40 backdrop-blur-sm border border-white/30 rounded-md shadow-lg pointer-events-auto relative overflow-hidden w-full flex flex-col ${
        isMobile 
          ? 'px-4 py-4' 
          : 'px-4 py-5'
      }`}>
        <div className={`relative z-10 ${isMobile ? 'flex items-center justify-between gap-2' : 'flex items-center justify-between gap-3'}`}>
          {/* Left side: Score */}
          <div className={`flex items-center gap-2 ${isMobile ? '' : ''}`}>
            <div className="flex flex-col">
              {!isMobile && <p className="text-xs text-white/70 uppercase tracking-widest mb-0.5">Score</p>}
              <h3 className={`font-semibold text-white tracking-tight ${isMobile ? 'text-xl' : 'text-xl'}`}>
                {Math.round(score)}%
              </h3>
            </div>
          </div>
          
          {/* Right side: Countdown and buttons */}
          <div className={`flex items-center gap-2 flex-shrink-0 ${isMobile ? 'flex-1 justify-end' : ''}`}>
            {/* Countdown (when not paused and not always paused) */}
            {!alwaysPaused && !isPaused && (
              <div className="flex items-center gap-1">
                <p className={`text-white/70 whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{isMobile ? 'Next' : 'Next in'}</p>
                <div className={`flex items-center justify-center rounded-md bg-turquoise-500/20 border border-turquoise-500/30 ${
                  isMobile ? 'w-5 h-5' : 'w-7 h-7'
                }`}>
                  <span className={`font-semibold text-turquoise-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{countdown}</span>
                </div>
                <p className={`text-white/70 whitespace-nowrap ${isMobile ? 'text-[10px]' : 'text-xs'}`}>s</p>
              </div>
            )}
            {/* Pause/Resume button (when not always paused) */}
            {!alwaysPaused && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePauseToggle();
                }}
                className={`bg-black/40 backdrop-blur-sm hover:bg-black/50 text-white/90 hover:text-white rounded-md font-medium transition-all border border-white/30 relative z-20 ${
                  isMobile 
                    ? 'px-3 py-2 text-xs' 
                    : 'px-3 py-2 text-xs whitespace-nowrap'
                }`}
                type="button"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {/* Next Stock button */}
            {onNext && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Dispatch event for tutorial to detect
                  window.dispatchEvent(new CustomEvent('tutorial-next-card-clicked'));
                  if (onNext) {
                    onNext();
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                data-tutorial-next
                className={`bg-turquoise-500/20 hover:bg-turquoise-500/30 text-turquoise-400 hover:text-turquoise-300 rounded-md font-medium transition-all border border-turquoise-500/30 relative z-[10001] ${
                  isMobile 
                    ? 'px-3 py-1.5 text-xs' 
                    : 'px-3 py-1 text-xs whitespace-nowrap'
                }`}
                style={{ pointerEvents: 'auto', zIndex: 10001 }}
                type="button"
              >
                Next Stock
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartScoreOverlay;

