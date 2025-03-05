/**
 * TimerDurationSelector.js
 * 
 * Component for selecting the timer duration for each match.
 * Features:
 * - Dropdown menu with preset timer durations
 * - Visual feedback for the current selection
 * - Responsive design that adapts to different screen sizes
 */
import React from "react";

const TimerDurationSelector = ({ duration, onChange }) => {
  // Preset timer durations in seconds
  const durations = [
    { value: 30, label: "30 seconds" },
    { value: 45, label: "45 seconds" },
    { value: 60, label: "60 seconds" },
    { value: 90, label: "90 seconds" },
    { value: 120, label: "2 minutes" },
    { value: 180, label: "3 minutes" },
  ];

  return (
    <div className="relative w-full">
      <select
        id="timer-duration"
        value={duration}
        onChange={(e) => onChange(Number(e.target.value))}
        className="p-3 sm:p-2 md:p-3 border border-turquoise-300 rounded-lg text-turquoise-900 w-full text-base sm:text-sm md:text-base h-12 sm:h-auto appearance-none bg-soft-white shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500 font-medium"
      >
        {durations.map((option) => (
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
    </div>
  );
};

export default TimerDurationSelector; 