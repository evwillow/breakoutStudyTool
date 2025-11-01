"use client";

/**
 * ChartMagnifier Component
 * 
 * Provides a magnifying glass tool for easier precise selection on charts
 * Works on both desktop and mobile with touch support
 */

import React, { useState, useEffect, useRef } from 'react';

const ChartMagnifier = ({ 
  onSelection, 
  enabled = true,
  magnifierSize = 150,
  chartElement = null
}) => {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const magnifierRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !isActive || !chartElement) return;

    const handleMouseMove = (e) => {
      const rect = chartElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Clamp to chart bounds
      const clampedX = Math.max(0, Math.min(rect.width, x));
      const clampedY = Math.max(0, Math.min(rect.height, y));
      
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleMouseDown = (e) => {
      e.preventDefault();
      const rect = chartElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setIsActive(false);
      
      // Create synthetic click event for the chart
      if (onSelection) {
        const syntheticEvent = {
          clientX: rect.left + x,
          clientY: rect.top + y,
          preventDefault: () => {},
          stopPropagation: () => {},
        };
        onSelection(syntheticEvent);
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 0) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = chartElement.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      const clampedX = Math.max(0, Math.min(rect.width, x));
      const clampedY = Math.max(0, Math.min(rect.height, y));
      
      setPosition({ x: clampedX, y: clampedY });
    };

    const handleTouchEnd = (e) => {
      if (e.changedTouches.length === 0) return;
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = chartElement.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      setIsActive(false);
      
      if (onSelection) {
        const syntheticEvent = {
          clientX: rect.left + x,
          clientY: rect.top + y,
          preventDefault: () => {},
          stopPropagation: () => {},
        };
        onSelection(syntheticEvent);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    chartElement.addEventListener('mousedown', handleMouseDown);
    chartElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    chartElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      chartElement.removeEventListener('mousedown', handleMouseDown);
      chartElement.removeEventListener('touchmove', handleTouchMove);
      chartElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, isActive, onSelection, chartElement]);

  if (!enabled) return null;

  if (!chartElement) {
    // Return button only if no chart element yet
    return (
      <button
        onClick={() => setIsActive(!isActive)}
        className={`absolute top-2 right-2 z-50 p-2 rounded-full bg-turquoise-600 hover:bg-turquoise-700 text-white shadow-lg transition-all duration-200 ${
          isActive ? 'ring-2 ring-turquoise-400 ring-offset-2 ring-offset-black' : ''
        }`}
        title="Magnifying Glass Tool"
        aria-label="Toggle magnifying glass"
      >
        <svg 
          className="w-5 h-5 sm:w-6 sm:h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" 
          />
        </svg>
      </button>
    );
  }

  const rect = chartElement.getBoundingClientRect();
  const magnifierX = rect.left + position.x;
  const magnifierY = rect.top + position.y;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsActive(!isActive)}
        className={`absolute top-2 right-2 z-50 p-2 rounded-full bg-turquoise-600 hover:bg-turquoise-700 text-white shadow-lg transition-all duration-200 ${
          isActive ? 'ring-2 ring-turquoise-400 ring-offset-2 ring-offset-black' : ''
        }`}
        title="Magnifying Glass Tool"
        aria-label="Toggle magnifying glass"
      >
        <svg 
          className="w-5 h-5 sm:w-6 sm:h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" 
          />
        </svg>
      </button>

      {/* Magnifier Overlay */}
      {isActive && (
        <div
          ref={magnifierRef}
          className="fixed z-50 pointer-events-none border-2 border-turquoise-400 rounded-full bg-black bg-opacity-90 shadow-2xl"
          style={{
            left: `${magnifierX - magnifierSize / 2}px`,
            top: `${magnifierY - magnifierSize / 2}px`,
            width: `${magnifierSize}px`,
            height: `${magnifierSize}px`,
            backgroundImage: `radial-gradient(circle, rgba(0,255,255,0.15) 0%, rgba(0,0,0,0.95) 100%)`,
            boxShadow: '0 0 30px rgba(0,255,255,0.6), inset 0 0 30px rgba(0,255,255,0.3)',
          }}
        >
          {/* Center crosshair */}
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-turquoise-400 rounded-full shadow-lg z-10"
          />
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-0.5 bg-turquoise-400 opacity-60"
          />
          <div 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-0.5 h-full bg-turquoise-400 opacity-60"
          />
        </div>
      )}
    </>
  );
};

export default ChartMagnifier;

