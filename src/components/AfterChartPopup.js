/**
 * AfterChartPopup.js
 * 
 * A full-screen popup component that displays the "after.csv" chart data
 * with a semi-transparent black background and a close button.
 */
"use client";
import React, { useEffect, useRef } from 'react';
import StockChart from './StockChart';

const AfterChartPopup = ({ isOpen, onClose, afterCsvData, stockName }) => {
  const chartContainerRef = useRef(null);

  // Prevent scrolling when popup is open and handle keyboard events
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling
      document.body.style.overflow = 'hidden';
      
      // Add keyboard event listener for space and enter keys
      const handleKeyDown = (e) => {
        if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleKeyDown);
      
      // Cleanup
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose} // Close on any click on the overlay
    >
      <div 
        className="fixed inset-0 bg-black bg-opacity-90 p-4 md:p-8"
        onClick={handleContainerClick} // Close when clicking on the container but not its children
      >
        <button
          className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 rounded-full p-2 text-white"
          onClick={onClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {stockName} After
          </h2>
        </div>
        
        <div 
          className="h-[calc(100vh-120px)]" 
          ref={chartContainerRef}
          onClick={(e) => e.stopPropagation()} // Prevent clicks on the chart from closing the popup
        >
          <StockChart 
            csvData={afterCsvData} 
            chartType="after"
            height="100%"
            backgroundColor="transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default AfterChartPopup; 