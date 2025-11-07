"use client";

/**
 * TimerDurationSelector.js
 * 
 * Component for selecting the timer duration for each match.
 * Features:
 * - Popup modal that opens on click
 * - Button-based selection matching popup theme
 * - Reduced preset timer durations
 * - Custom time option with input field
 * - Visual feedback for the current selection
 * - Responsive design that adapts to different screen sizes
 */
import React, { useState, useEffect, useRef, useMemo } from "react";

const TimerDurationSelector = ({ duration, onChange }) => {
  const [showPopup, setShowPopup] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const customInputRef = useRef(null);

  // Reduced preset timer durations in seconds - memoize to prevent recreation
  const durations = useMemo(() => [
    { value: 30, label: "30 seconds" },
    { value: 60, label: "1 minute" },
    { value: 120, label: "2 minutes" },
    { value: 180, label: "3 minutes" },
  ], []);
  
  // Get preset option values for quick comparison - memoize to prevent recreation
  const presetValues = useMemo(() => 
    durations.map(option => Number(option.value)),
    [durations]
  );
  
  // Check if the current duration is a preset value
  const isPreset = useMemo(() => {
    if (duration === 0) return false; // Always pause is not a preset
    return presetValues.includes(duration);
  }, [duration, presetValues]);

  // Format duration for display
  const formatDuration = (seconds) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
  };

  // Handle preset button click
  const handlePresetClick = (value) => {
    onChange(Number(value));
    setShowPopup(false);
    setShowCustomInput(false);
  };

  // Handle custom button click
  const handleCustomClick = () => {
    setShowCustomInput(true);
    setCustomValue("");
  };

  // Handle custom input change
  const handleCustomInputChange = (e) => {
    const value = e.target.value;
    setCustomValue(value);
  };

  // Handle custom input submission
  const handleCustomSubmit = () => {
    // Validate and convert input
    let numValue = 60; // Default fallback
    
    if (customValue && !isNaN(customValue)) {
      // Convert to number and enforce minimum value of 1
      numValue = Math.max(1, Math.round(Number(customValue)));
      console.log(`Custom timer value submitted: ${numValue}`);
    } else {
      console.log(`Invalid custom timer value: "${customValue}", using ${numValue} instead`);
    }
    
    // Always call onChange with the validated value
    onChange(numValue);
    setShowPopup(false);
    setShowCustomInput(false);
    setCustomValue("");
  };

  // Handle key press in custom input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      console.log('Timer customization canceled');
      setShowCustomInput(false);
      setCustomValue("");
    }
  };

  // Focus input when custom input is shown
  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  // Close popup when clicking outside
  useEffect(() => {
    if (!showPopup) return;

    function handleClickOutside(event) {
      const popup = document.getElementById('timer-popup');
      const trigger = document.getElementById('timer-trigger');
      if (popup && trigger && !popup.contains(event.target) && !trigger.contains(event.target)) {
        setShowPopup(false);
        setShowCustomInput(false);
        setCustomValue("");
      }
    }

    // Add event listener with a small delay to avoid immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    
    // Clean up
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPopup]);

  // Get current duration display text
  const getCurrentDurationText = () => {
    if (duration === 0) return "Always Paused";
    if (isPreset) {
      const option = durations.find(opt => opt.value === duration);
      return option ? option.label : formatDuration(duration);
    }
    return formatDuration(duration);
  };

  return (
    <div className="relative w-full">
      {/* Trigger button */}
      <button
        id="timer-trigger"
        onClick={() => setShowPopup(!showPopup)}
        className="w-full h-12 border border-turquoise-300 rounded-lg text-turquoise-900 bg-soft-white shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500 font-medium text-center text-lg sm:text-base md:text-lg px-4 flex items-center justify-center"
      >
        {getCurrentDurationText()}
        <svg className={`ml-2 h-5 w-5 text-turquoise-500 transition-transform ${showPopup ? '' : 'rotate-180'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Popup - positioned near button */}
      {showPopup && (
        <div
          id="timer-popup"
          className="absolute bottom-full left-0 right-0 mb-2 z-[100] bg-soft-white rounded-lg shadow-lg border border-turquoise-300 overflow-hidden"
        >
          {/* Title section - compact for dropdown */}
          <div className="p-3 sm:p-4 border-b border-turquoise-300">
            <h3 className="text-base sm:text-lg text-turquoise-700 font-bold">
              Select Duration
            </h3>
          </div>
          
          {/* Custom input section */}
          {showCustomInput ? (
            <div className="p-3 sm:p-4">
              <input
                ref={customInputRef}
                type="number"
                value={customValue}
                onChange={handleCustomInputChange}
                onKeyDown={handleKeyPress}
                min="1"
                max="1800"
                placeholder="Enter seconds..."
                className="w-full px-3 py-2 border-2 border-turquoise-300 rounded-lg text-turquoise-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500 mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCustomSubmit}
                  className="flex-1 px-3 py-2 bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white rounded-md hover:from-turquoise-600 hover:to-turquoise-700 transition text-sm sm:text-base font-medium shadow-sm"
                >
                  Set
                </button>
                <button
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomValue("");
                  }}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all font-medium text-sm sm:text-base"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Press Enter or Esc
              </p>
            </div>
          ) : (
            <div className="p-2 sm:p-3">
              {/* Selection options - matching popup button style */}
              <div className="flex flex-col gap-2">
                {durations.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handlePresetClick(option.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white rounded-md hover:from-turquoise-600 hover:to-turquoise-700 transition text-sm sm:text-base font-medium shadow-sm"
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  onClick={handleCustomClick}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-turquoise-500 to-turquoise-600 text-white rounded-md hover:from-turquoise-600 hover:to-turquoise-700 transition text-sm sm:text-base font-medium shadow-sm"
                >
                  Custom time...
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TimerDurationSelector; 