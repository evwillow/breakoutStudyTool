/**
 * Popup Component
 * 
 * Modal dialog that appears when the timer expires, prompting the user to make a selection.
 * Features:
 * - Fixed position overlay that blocks interaction with the underlying content
 * - Responsive design that adapts to different screen sizes
 * - Clear visual hierarchy with prominent title and action buttons
 * - Predefined options for user selection
 */
import React from "react";

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

  return (
    // Full-screen overlay with semi-transparent background
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-1 sm:p-3 md:p-4">
      {/* Modal content container */}
      <div className="bg-soft-white p-3 sm:p-4 md:p-6 rounded shadow-lg text-center w-[95%] sm:w-auto sm:max-w-sm">
        <h2 className="text-xl sm:text-lg md:text-xl mb-4 sm:mb-3 md:mb-4 text-white font-bold bg-turquoise-600 py-2 px-4 rounded-lg shadow-md">
          Time is up! Make a selection:
        </h2>
        {/* Selection options */}
        <div className="flex flex-col justify-around gap-2 sm:gap-2 md:gap-3">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className="px-4 sm:px-3 md:px-4 py-4 sm:py-2 bg-soft-gray-200 text-turquoise-600 rounded hover:bg-soft-gray-100 transition text-lg sm:text-sm md:text-base font-medium"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Popup;
