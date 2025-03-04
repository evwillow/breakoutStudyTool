// src/components/NavigationButtons.js
import React from "react";

/**
 * NavigationButtons Component
 * 
 * Provides navigation controls for moving between items.
 * Features:
 * - Previous and Next buttons with consistent styling
 * - Responsive design for different screen sizes
 * - Visual indicators for navigation direction
 * - Hover effects for better user interaction
 */
const NavigationButtons = React.memo(function NavigationButtons({
  onPrevious,
  onNext,
}) {
  return (
    <div className="px-4 sm:px-28 pb-10 mt-8 flex justify-center space-x-4">
      <button
        onClick={onPrevious}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-200 text-lg mx-2 shadow-md flex items-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
        </svg>
        Previous
      </button>
      <button
        onClick={onNext}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-200 text-lg mx-2 shadow-md flex items-center"
      >
        Next
        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </button>
    </div>
  );
});

export default NavigationButtons;
