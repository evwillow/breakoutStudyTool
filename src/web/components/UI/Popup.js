"use client";

/**
 * Popup Component
 * 
 * Modal dialog that appears when the timer expires, prompting the user to make a selection.
 * Features:
 * - Fixed position overlay that blocks interaction with the underlying content
 * - Responsive design that adapts to different screen sizes
 * - Clear visual hierarchy with prominent title and action buttons
 * - Predefined options for user selection
 * - Mobile-friendly layout with text positioned closer to buttons
 * - Prevents scrolling when popup is active
 */
import React, { useEffect } from "react";

/**
 * Popup displays a modal dialog with selection options
 * 
 * @param {Function} onSelect - Callback function that receives the selected option value
 */
const Popup = ({ onSelect }) => {
  // Predefined options for user selection
  const options = [
    { label: "-5%", value: 1 },
    { label: "0%", value: 2 },
    { label: "20%", value: 3 },
    { label: "50%", value: 4 },
  ];

  // Prevent scrolling when popup is active
  useEffect(() => {
    // Save the current body overflow style
    const originalStyle = document.body.style.overflow;
    
    // Prevent scrolling
    document.body.style.overflow = "hidden";
    
    // Restore original style when component unmounts
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  return (
    <>
      {/* Backdrop that starts below the header */}
      <div className="fixed top-[70px] bottom-0 left-0 right-0 bg-black bg-opacity-50 backdrop-blur-md z-[20]" />
      
      {/* Modal container with no background */}
      <div className="fixed inset-0 flex items-center justify-center z-40 p-1 sm:p-3 md:p-4">
        {/* Modal content container - positioned lower on mobile */}
        <div className="bg-soft-white p-3 sm:p-4 md:p-6 rounded-lg shadow-lg text-center w-[95%] sm:w-auto sm:max-w-sm mt-[70px] sm:mt-0 max-h-[90vh] overflow-hidden z-[41]">
          {/* Title section - reduced spacing on mobile */}
          <div className="mb-2 sm:mb-4">
            <h2 className="text-xl sm:text-lg md:text-xl text-turquoise-700 font-bold">
              Time's Up!
            </h2>
            <p className="text-gray-600 mt-1 sm:mt-2 text-base sm:text-sm">
              Please make your selection:
            </p>
          </div>
          
          {/* Selection options - improved spacing and sizing for mobile */}
          <div className="flex flex-col justify-around gap-2 sm:gap-2 md:gap-3">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => onSelect(option.value)}
                className="px-4 sm:px-3 md:px-4 py-3 sm:py-3 bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white rounded-md hover:from-turquoise-600 hover:to-turquoise-700 transition text-lg sm:text-base font-medium shadow-sm"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Popup;
