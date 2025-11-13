/**
 * @fileoverview Renders folder selection UI for navigating flashcard datasets.
 * @module src/web/components/FolderSection/FolderSection.js
 * @dependencies React
 */
import React from 'react';

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
  pointsTextArray = [],
  isTimeUp = false,
}) {
  return (
    <div className="bg-transparent w-full">
      {/* Folder Selector - Hidden by default, shown during tutorial */}
      <div className="flex flex-col gap-4 mb-4" style={{ display: 'none' }}>
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
                data-tutorial-folder-selector
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

      {/* Right column: Points, Accuracy, and Rounds */}
      <div className="flex flex-col pt-1 sm:pt-2 lg:pt-2 px-1 sm:px-6 md:px-10 md:pr-10 lg:pl-2 gap-3 items-start w-full relative z-50">
        {/* Mobile: 2 columns, Desktop: single column */}
        <div className="w-full flex flex-row lg:flex-col items-start gap-3">
          {/* Left column on mobile: Points Display - Box with bullet points */}
          <div className="flex-1 lg:flex-none lg:w-full min-w-0 basis-1/2 lg:basis-auto">
            {(() => {
              // Ensure we have a valid array - handle undefined/null gracefully
              const safePointsArray = Array.isArray(pointsTextArray) ? pointsTextArray : (pointsTextArray ? [pointsTextArray] : []);
              
              // Always render the container to maintain consistent layout timing
              return (
                <div className="bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30 w-full min-w-0">
                  {safePointsArray.length > 0 ? (
                    <ul className="list-none space-y-1">
                      {safePointsArray.map((text, index) => {
                        const displayText = text && typeof text === 'string' ? text.trim() : '';
                        if (!displayText) return null;
                        return (
                          <li key={`point-${index}-${displayText || index}`} className="flex items-start gap-2">
                            <span className="text-white/70 text-sm flex-shrink-0 mt-0.5">•</span>
                            <span className="text-sm text-white/90 font-medium break-words flex-1">{displayText}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="min-h-[20px]"></div>
                  )}
                </div>
              );
            })()}
          </div>

        {/* Right column on mobile: Accuracy and Rounds */}
        <div className="flex flex-col items-start gap-3 flex-1 lg:flex-none lg:w-full min-w-0 basis-1/2 lg:basis-auto">
          {/* Accuracy display */}
          <div className="flex items-center gap-2 bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30 w-full min-w-0">
            <span className="text-sm font-medium text-white/90">Avg. Accuracy:</span>
            <span className="text-base font-semibold text-white">{accuracy}%</span>
          </div>

          {/* Round History button with plus button */}
          <div className="flex items-center gap-2 bg-black/95 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/30 w-full min-w-0">
            <button 
              onClick={onRoundHistory}
              data-tutorial-round-history
              className="flex items-center gap-2 text-sm font-medium text-white/90 hover:text-white transition-colors flex-1"
            >
              <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span className="whitespace-nowrap">Rounds</span>
            </button>
            <button
              onClick={onNewRound}
              disabled={isCreatingRound}
              className={`flex items-center justify-center rounded-md flex-shrink-0 ${
                isCreatingRound 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:opacity-80 active:opacity-60'
              } transition-all`}
              title="New Round"
            >
              {isCreatingRound ? (
                <svg className="w-4 h-4 text-white/70 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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