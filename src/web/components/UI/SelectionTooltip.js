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
      className={`absolute z-[60] pointer-events-auto ${
        isExiting
          ? 'transition-all duration-250 ease-in opacity-0 blur-sm translate-y-2 scale-95'
          : 'transition-all duration-150 ease-out opacity-100 blur-0 translate-y-0 scale-100'
      }`}
      style={tooltipStyle}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <div className="relative rounded-md shadow-2xl border border-turquoise-400/70 px-5 sm:px-6 py-4 sm:py-5" style={{ background: 'var(--soft-white)' }}>
        <div
          className="absolute"
          style={{
            bottom: '-14px',
            right: '26px',
            width: '28px',
            height: '14px',
            background: 'rgba(45, 212, 191, 0.7)',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
          }}
        />
        <div
          className="absolute"
          style={{
            bottom: '-12.5px',
            right: '26.5px',
            width: '27px',
            height: '12.5px',
            background: 'var(--soft-white)',
            clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
          }}
        />

        <p className="text-turquoise-300 font-semibold text-base sm:text-lg mb-1">
          {isMobile ? 'Tap to drop your guess' : 'Click to drop your guess'}
        </p>
        <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
          {isMobile ? 'Touch & hold, drag to your spot, then lift your finger.' : 'Click in the prediction area on the right side of the chart.'}
        </p>
      </div>
    </div>
  );
};

export default SelectionTooltip;
