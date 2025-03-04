/**
 * AfterChartPopup.js
 * 
 * A full-screen popup component that displays the "after.csv" chart data
 * with a transparent black background and intuitive closing options.
 * Features:
 * - Transparent black background for better focus on chart
 * - Compact chart container to maximize click-off area
 * - Device-specific closing instructions
 * - Keyboard navigation support (Space/Enter/Escape)
 */
"use client";
import React, { useEffect, useRef, useState } from 'react';
import StockChart from './StockChart';

const AfterChartPopup = ({ isOpen, onClose, afterCsvData, stockName }) => {
  const chartContainerRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Check if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Prevent scrolling when popup is open and handle keyboard events
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setShowHint(true);
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      
      // Add keyboard event listener for space and enter keys
      const handleKeyDown = (e) => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      // Hide the hint after 3 seconds
      const hintTimer = setTimeout(() => {
        setShowHint(false);
      }, 3000);
      
      // Cleanup
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
        clearTimeout(hintTimer);
      };
    } else {
      document.body.style.overflow = '';
      // Reset animation state when closed
      setIsAnimating(false);
    }
  }, [isOpen, onClose]);

  // If not open or no data, don't render anything
  if (!isOpen || !afterCsvData) {
    return null;
  }

  // Handle click on the popup container
  const handleContainerClick = (e) => {
    // Only close if the click is directly on the container, not on its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Get device-specific closing instruction
  const closeInstruction = isMobile 
    ? "Tap outside chart to close" 
    : "Press Space/Esc or click outside to close";

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 transition-opacity duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose} // Close on any click on the overlay
    >
      <div 
        className={`fixed inset-0 bg-transparent p-4 md:p-8 transition-all duration-300 ease-in-out flex flex-col items-center justify-center ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={handleContainerClick} // Close when clicking on the container but not its children
      >
        <button
          className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 text-white transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white"
          onClick={onClose}
          aria-label="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div 
          className="w-full max-w-3xl h-auto rounded-lg overflow-hidden border border-gray-700 shadow-2xl bg-black bg-opacity-50" 
          ref={chartContainerRef}
          onClick={(e) => e.stopPropagation()} // Prevent clicks on the chart from closing the popup
          style={{ maxHeight: '70vh' }}
        >
          <StockChart 
            csvData={afterCsvData} 
            chartType="after"
            height="100%"
            width="100%"
            backgroundColor="transparent"
          />
        </div>
        
        {/* Closing instructions that fade out */}
        <div className={`mt-4 text-center transition-opacity duration-500 ${showHint ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white text-sm md:text-base bg-black bg-opacity-50 px-4 py-2 rounded-full">
            {closeInstruction}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AfterChartPopup; 