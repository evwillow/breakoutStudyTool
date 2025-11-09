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
                className="p-3 sm:p-2 md:p-3 border border-turquoise-300 rounded-md text-turquoise-900 w-full text-base sm:text-sm md:text-base h-12 sm:h-auto appearance-none bg-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500 font-medium"
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

      {/* Compact layout: Accuracy, and Round History - one line on desktop, two lines on mobile */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mt-3">
        {/* First row on mobile: Accuracy */}
        <div className="flex flex-row gap-3 md:contents">
          {/* Accuracy display - first item */}
          <div className="flex items-center gap-2 bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30">
            <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="text-sm font-medium text-white/90">Average Accuracy:</span>
            <span className="text-base font-bold text-white">{accuracy}%</span>
          </div>
        </div>

        {/* Second row on mobile: Round History with plus button */}
        <div className="flex flex-row gap-3 md:contents">
          {/* Round History button with plus button on the right */}
          <div className="flex flex-col flex-1 md:flex-1">
            <label className="mb-1 text-sm font-medium text-turquoise-700 invisible">
              {/* Invisible label for alignment */}
              Button:
            </label>
            <div className="w-full h-12 bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white text-base rounded-md shadow-md hover:from-turquoise-800 hover:to-turquoise-700 transition font-medium flex items-center border border-turquoise-300">
              <button 
                onClick={onRoundHistory}
                className="flex-1 flex items-center justify-center h-full"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Rounds
              </button>
              <button
                onClick={onNewRound}
                disabled={isCreatingRound}
                className={`ml-2 mr-1 h-10 w-10 flex items-center justify-center rounded-md border border-turquoise-400/50 bg-turquoise-500/30 ${
                  isCreatingRound 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-turquoise-500/50 hover:border-turquoise-400 active:bg-turquoise-500/60'
                } transition-all`}
                title="New Round"
              >
                {isCreatingRound ? (
                  <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FolderSection;