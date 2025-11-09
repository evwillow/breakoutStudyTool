"use client";

/**
 * SelectionTooltip Component
 * 
 * Speech bubble tooltip that appears when the timer runs out without a selection.
 * Positioned near the chart selection area with a quote box style design.
 */

import React, { useEffect, useState, useRef, useCallback } from "react";

/**
 * SelectionTooltip displays concise instructions for making selections
 * 
 * @param {boolean} show - Whether to show the tooltip
 * @param {Function} onDismiss - Optional callback when tooltip is dismissed
 */
const SelectionTooltip = ({ show, onDismiss, style, durationSeconds }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const autoHideTimeoutRef = useRef(null);
  const exitTimeoutRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 1024;
      const mobile = isSmallScreen && hasTouch;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const clearAllTimeouts = () => {
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }
  };

  const startExit = useCallback((reason = 'auto') => {
    if (exitTimeoutRef.current) return;

    clearAllTimeouts();
    setIsExiting(true);

    exitTimeoutRef.current = window.setTimeout(() => {
      onDismiss?.({ reason });
      exitTimeoutRef.current = null;

      cleanupTimeoutRef.current = window.setTimeout(() => {
        setIsExiting(false);
        cleanupTimeoutRef.current = null;
      }, 100);
    }, 250);
  }, [onDismiss]);

  useEffect(() => {
    if (!show) return;

    setIsExiting(false);

    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }

    autoHideTimeoutRef.current = window.setTimeout(() => {
      startExit('auto');
    }, 5000);

    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
        autoHideTimeoutRef.current = null;
      }
    };
  }, [show, startExit]);

  useEffect(() => () => {
    clearAllTimeouts();
  }, []);

  const shouldRender = show || isExiting;
  if (!shouldRender) {
    return null;
  }

  const tooltipStyle = {
    top: '16px',
    right: '16px',
    maxWidth: isMobile ? '320px' : '260px',
    minWidth: isMobile ? '240px' : '220px',
    ...style,
  };

  return (
    <div
      className={`absolute z-[60] pointer-events-auto isolate ${
        isExiting
          ? 'transition-all duration-250 ease-in opacity-0 blur-sm translate-y-2 scale-95'
          : 'transition-all duration-150 ease-out opacity-100 blur-0 translate-y-0 scale-100'
      }`}
      style={tooltipStyle}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="relative text-white font-semibold bg-black/95 backdrop-blur-sm px-3 sm:px-2 py-1.5 sm:py-1 rounded-md text-lg sm:text-base border border-white/30 shadow-lg">
        <div
          className="absolute"
          style={{
            bottom: '-8px',
            right: '26px',
            width: '16px',
            height: '8px',
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(4px)',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-7px',
            right: '26.5px',
            width: '15px',
            height: '7px',
            background: 'rgba(255, 255, 255, 0.3)',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
          }}
        />
        <p className="text-white font-semibold text-base sm:text-lg mb-0.5">
          {isMobile ? 'Tap to place your guess' : 'Click to place your guess'}
        </p>
        <p className="text-white/90 text-sm sm:text-base leading-relaxed">
          {isMobile ? 'Drag to adjust position' : 'Click on the right side of the chart'}
        </p>
      </div>
    </div>
  );
};

export default SelectionTooltip;
