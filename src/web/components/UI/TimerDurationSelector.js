"use client";

/**
 * TimerDurationSelector.js
 * 
 * Component for selecting the timer duration for each match.
 * Features:
 * - Dropdown menu with preset timer durations
 * - Custom time option with input field
 * - Visual feedback for the current selection
 * - Responsive design that adapts to different screen sizes
 */
import React, { useState, useEffect, useRef, useMemo } from "react";

const TimerDurationSelector = ({ duration, onChange }) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [customOption, setCustomOption] = useState(null);
  const customInputRef = useRef(null);
  const isInitialMount = useRef(true);
  const lastProcessedDuration = useRef(duration);

  // Preset timer durations in seconds - memoize to prevent recreation
  const durations = useMemo(() => [
    { value: 30, label: "30 seconds" },
    { value: 45, label: "45 seconds" },
    { value: 60, label: "60 seconds" },
    { value: 90, label: "90 seconds" },
    { value: 120, label: "2 minutes" },
    { value: 180, label: "3 minutes" },
    { value: "custom", label: "Custom time..." },
  ], []);
  
  // Get preset option values for quick comparison - memoize to prevent recreation
  const presetValues = useMemo(() => 
    durations
      .filter(option => option.value !== "custom")
      .map(option => Number(option.value)),
    [durations]
  );
  
  // Check if always pause is selected
  const isAlwaysPaused = duration === 0;
  
  // Check if the current duration is a preset or custom value
  useEffect(() => {
    // Skip if duration hasn't changed to prevent infinite loops
    if (lastProcessedDuration.current === duration) {
      return;
    }
    
    // Update last processed duration
    lastProcessedDuration.current = duration;
    
    // Skip on initial mount to prevent overriding parent state
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // If we already have a custom value at mount time, set up the custom option
      if (!presetValues.includes(duration) && duration > 0) {
        setCustomOption({ 
          value: duration, 
          label: `${duration} seconds (custom)` 
        });
      }
      return;
    }
    
    // Check if the current duration matches any preset
    const isPreset = presetValues.includes(duration);
    
    if (!isPreset && duration > 0) {
      // It's a custom value - set the custom option
      setCustomOption({ 
        value: duration, 
        label: `${duration} seconds (custom)` 
      });
    }
  }, [duration, presetValues]);

  // Setup click outside handler for custom input
  useEffect(() => {
    if (!showCustomInput) return;

    function handleClickOutside(event) {
      if (customInputRef.current && !customInputRef.current.contains(event.target)) {
        handleCustomSubmit();
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomInput]);

  // Get all options including any custom option
  const getAllOptions = () => {
    if (customOption) {
      // Insert custom option before the "Custom time..." option
      return [...durations.slice(0, -1), customOption, durations[durations.length - 1]];
    }
    return durations;
  };

  // Handle dropdown change
  const handleSelectChange = (e) => {
    const value = e.target.value;
    if (value === "custom") {
      setShowCustomInput(true);
      setCustomValue("");
    } else {
      setShowCustomInput(false);
      onChange(Number(value));
    }
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
      
      // Only create a custom option if it's not a preset value
      if (!presetValues.includes(numValue)) {
        setCustomOption({ 
          value: numValue, 
          label: `${numValue} seconds (custom)` 
        });
      }
    } else {
      console.log(`Invalid custom timer value: "${customValue}", using ${numValue} instead`);
    }
    
    // Always call onChange with the validated value
    onChange(numValue);
    setShowCustomInput(false);
  };

  // Handle key press in custom input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      console.log('Timer customization canceled, reverting to previous value');
      setShowCustomInput(false);
      // No need to call onChange since we're not changing the value
    }
  };

  // Determine the correct value to display in the dropdown - memoize to prevent recalculation
  const selectValue = useMemo(() => {
    if (showCustomInput) {
      return "custom";
    }
    
    // If duration is 0 (always pause), default to 60 seconds (always pause is handled by slider in overlay)
    if (duration === 0) {
      return 60;
    }
    
    // If the current duration is a preset value, use that
    if (presetValues.includes(duration)) {
      return duration;
    }
    
    // Otherwise, use the custom option value if we have one
    return customOption ? customOption.value : duration;
  }, [showCustomInput, duration, presetValues, customOption]);

  return (
    <div className="relative w-full">
      <select
        id="timer-duration"
        value={selectValue}
        onChange={handleSelectChange}
        className="p-3 sm:p-2 md:p-3 border border-turquoise-300 rounded-lg text-turquoise-900 w-full text-base sm:text-sm md:text-base h-12 appearance-none bg-soft-white shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500 font-medium"
      >
        {getAllOptions().map((option) => (
          <option key={option.value} value={option.value} className="text-turquoise-900 font-medium">
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="h-5 w-5 text-turquoise-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      
      {/* Custom duration input */}
      {showCustomInput && (
        <div 
          ref={customInputRef}
          className="absolute top-full left-0 w-full mt-2 z-[100]"
        >
          <div className="p-3 border border-turquoise-300 rounded-lg bg-soft-white shadow-md">
            <div className="flex items-center">
              <input
                type="number"
                value={customValue}
                onChange={handleCustomInputChange}
                onKeyDown={handleKeyPress}
                autoFocus
                min="1"
                max="1800"
                placeholder="Enter seconds..."
                className="p-2 border border-turquoise-300 rounded-lg text-turquoise-900 w-full text-base appearance-none focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
              />
              <button
                onClick={handleCustomSubmit}
                className="ml-2 px-3 py-2 bg-turquoise-500 text-white rounded-lg hover:bg-turquoise-600 transition-colors"
              >
                Set
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">Press Enter to confirm or Esc to cancel</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerDurationSelector; 