/**
 * FolderSection Component
 * 
 * Displays folder selection controls and round management options.
 * Features:
 * - Dropdown for selecting different data folders
 * - Display of current accuracy percentage
 * - Buttons for creating new rounds and viewing round history
 * - Responsive design that adapts to different screen sizes
 * - Optimized with React.memo for performance
 * - Clean, borderless design with soft backgrounds for reduced eye strain
 */
import React from "react";
import TimerDurationSelector from "./TimerDurationSelector";

/**
 * FolderSection displays folder selection and round management controls
 * 
 * @param {string} selectedFolder - Currently selected folder name
 * @param {Array} folderOptions - Available folder options with key, value, and label
 * @param {Function} onFolderChange - Handler for folder selection changes
 * @param {number} accuracy - Current accuracy percentage
 * @param {Function} onNewRound - Handler for creating a new round
 * @param {Function} onRoundHistory - Handler for viewing round history
 * @param {number} timerDuration - Current timer duration in seconds
 * @param {Function} onTimerDurationChange - Handler for timer duration changes
 */
const FolderSection = React.memo(function FolderSection({
  selectedFolder,
  folderOptions,
  onFolderChange,
  accuracy,
  onNewRound,
  onRoundHistory,
  timerDuration,
  onTimerDurationChange,
}) {
  return (
    <div className="px-1 sm:px-8 md:px-16 lg:px-24 xl:px-56 pb-2 sm:pb-6 md:pb-10 pt-2 sm:pt-0 bg-transparent">
      <div className="flex flex-col gap-4">
        {/* Dataset and Timer selectors - side by side on all screen sizes */}
        <div className="flex flex-row flex-wrap gap-3">
          {/* Dataset label and dropdown */}
          <div className="flex flex-col flex-1 min-w-[140px]">
            <label htmlFor="dataset-selector" className="mb-1 text-sm font-medium text-turquoise-700">
              <svg className="w-4 h-4 inline-block mr-1 text-turquoise-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
              </svg>
              Dataset:
            </label>
            <div className="relative w-full">
              <select
                id="dataset-selector"
                value={selectedFolder || ""}
                onChange={onFolderChange}
                className="p-3 sm:p-2 md:p-3 border border-turquoise-300 rounded-lg text-turquoise-900 w-full text-base sm:text-sm md:text-base h-12 sm:h-auto appearance-none bg-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500 font-medium"
              >
                {folderOptions.map(({ key, value, label }) => (
                  <option key={key} value={value} className="text-turquoise-900 font-medium">
                    {label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg className="h-5 w-5 text-turquoise-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Timer Duration label and selector */}
          <div className="flex flex-col flex-1 min-w-[140px]">
            <label htmlFor="timer-duration" className="mb-1 text-sm font-medium text-turquoise-700">
              <svg className="w-4 h-4 inline-block mr-1 text-turquoise-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Timer:
            </label>
            <TimerDurationSelector 
              duration={timerDuration} 
              onChange={onTimerDurationChange} 
            />
          </div>
        </div>
        
        {/* Accuracy display */}
        <div className="flex flex-row items-center">
          <div className="flex flex-col flex-1 max-w-[140px]">
            <label className="mb-1 text-sm font-medium text-turquoise-700">
              <svg className="w-4 h-4 inline-block mr-1 text-turquoise-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Accuracy:
            </label>
            <div className="relative w-full">
              <div className="p-3 sm:p-2 md:p-3 border border-turquoise-300 rounded-lg bg-turquoise-600 text-white w-full text-base sm:text-sm md:text-base h-12 sm:h-auto shadow-sm font-medium flex items-center">
                <span className="font-bold pl-2">{accuracy}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Round management controls */}
      <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-start">
        <button 
          onClick={onNewRound}
          className="px-4 py-2 bg-gradient-turquoise text-white text-sm sm:text-sm md:text-base rounded-lg shadow-md hover-gradient-turquoise transition flex-1 sm:flex-none font-medium flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          New Round
        </button>
        <button 
          onClick={onRoundHistory}
          className="px-4 py-2 bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white text-sm sm:text-sm md:text-base rounded-lg shadow-md hover:from-turquoise-800 hover:to-turquoise-700 transition flex-1 sm:flex-none font-medium flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Round History
        </button>
      </div>
    </div>
  );
});

export default FolderSection;