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
import TimerDurationSelector from "../UI/TimerDurationSelector";

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
 * @param {boolean} isCreatingRound - Whether a round is currently being created
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
  isCreatingRound = false,
}) {
  return (
    <div className="px-2 sm:px-6 md:px-10 pb-2 sm:pb-6 md:pb-10 mt-5 sm:mt-6 bg-transparent">
      {/* ====================================================================
          DATASET SELECTOR - COMMENTED OUT BUT EASILY FINDABLE
          To re-enable: uncomment the section below (lines ~47-72)
          ==================================================================== */}
      {/* 
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex flex-row flex-wrap gap-3">
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
        </div>
      </div>
      */}

      {/* Compact layout: Timer, Accuracy, New Round, and Round History - one line on desktop, two lines on mobile */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4 mt-3">
        {/* First row on mobile: Timer and Accuracy */}
        <div className="flex flex-row gap-3 md:contents">
          {/* Timer Duration - first item */}
          <div className="flex flex-col flex-1 md:flex-1">
            <label htmlFor="timer-duration" className="mb-1 text-sm font-medium text-turquoise-700">
              <svg className="w-4 h-4 inline-block mr-1 text-turquoise-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Timer:
            </label>
            <div className="h-12">
              <div className="h-full">
                <TimerDurationSelector 
                  duration={timerDuration} 
                  onChange={onTimerDurationChange} 
                />
              </div>
            </div>
          </div>
          
          {/* Accuracy display - second item */}
          <div className="flex flex-col flex-1 md:flex-1">
            <label className="mb-1 text-sm font-medium text-turquoise-700">
              <svg className="w-4 h-4 inline-block mr-1 text-turquoise-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Accuracy:
            </label>
            <div className="relative w-full h-12">
              <div className="p-3 border border-turquoise-300 rounded-lg bg-turquoise-600 text-white w-full h-full text-base shadow-sm font-medium flex items-center justify-center">
                <span className="font-bold">{accuracy}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second row on mobile: New Round and Round History */}
        <div className="flex flex-row gap-3 md:contents">
          {/* New Round button - third item */}
          <div className="flex flex-col flex-1 md:flex-1">
            <label className="mb-1 text-sm font-medium text-turquoise-700 invisible">
              {/* Invisible label for alignment */}
              Button:
            </label>
            <button 
              onClick={onNewRound}
              disabled={isCreatingRound}
              className={`w-full h-12 ${
                isCreatingRound 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-turquoise hover-gradient-turquoise'
              } text-white text-base rounded-lg shadow-md transition font-medium flex items-center justify-center border border-turquoise-300`}
            >
              {isCreatingRound ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  New Round
                </>
              )}
            </button>
          </div>

          {/* Round History button - fourth item */}
          <div className="flex flex-col flex-1 md:flex-1">
            <label className="mb-1 text-sm font-medium text-turquoise-700 invisible">
              {/* Invisible label for alignment */}
              Button:
            </label>
            <button 
              onClick={onRoundHistory}
              className="w-full h-12 bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white text-base rounded-lg shadow-md hover:from-turquoise-800 hover:to-turquoise-700 transition font-medium flex items-center justify-center border border-turquoise-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Round History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FolderSection;