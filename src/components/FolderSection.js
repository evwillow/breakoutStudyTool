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
 */
const FolderSection = React.memo(function FolderSection({
  selectedFolder,
  folderOptions,
  onFolderChange,
  accuracy,
  onNewRound,
  onRoundHistory,
}) {
  return (
    <div className="px-1 sm:px-8 md:px-16 lg:px-24 xl:px-56 pb-2 sm:pb-6 md:pb-10 border-t border-turquoise-200 pt-2 sm:pt-0 sm:border-0 bg-turquoise-50">
      <div className="flex flex-col sm:flex-row sm:items-center">
        {/* Folder selection dropdown */}
        <div className="relative w-full sm:w-60">
          <select
            value={selectedFolder || ""}
            onChange={onFolderChange}
            className="p-3 sm:p-2 md:p-3 border border-turquoise-300 rounded-lg text-turquoise-800 w-full text-base sm:text-sm md:text-base h-12 sm:h-auto appearance-none bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-turquoise-500 focus:border-turquoise-500"
          >
            {folderOptions.map(({ key, value, label }) => (
              <option key={key} value={value}>
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
        
        {/* Accuracy statistics display */}
        <div className="pt-3 sm:pt-1 md:pt-3 sm:ml-10 flex items-center">
          <div className="mr-2 flex-shrink-0">
            <svg className="h-5 w-5 text-turquoise-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-turquoise-800 text-base sm:text-base md:text-lg font-medium">
            Accuracy: <span className="font-bold">{accuracy}%</span>
          </span>
        </div>
      </div>
      
      {/* Round management controls */}
      <div className="mt-3 sm:mt-4 md:mt-6 flex flex-wrap gap-2 sm:gap-3 justify-start">
        <button 
          onClick={onNewRound}
          className="px-4 py-2 bg-gradient-turquoise text-white text-sm sm:text-sm md:text-base rounded-lg shadow hover-gradient-turquoise transition flex-1 sm:flex-none font-medium flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          New Round
        </button>
        <button 
          onClick={onRoundHistory}
          className="px-4 py-2 bg-gradient-to-r from-turquoise-700 to-turquoise-600 text-white text-sm sm:text-sm md:text-base rounded-lg shadow hover:from-turquoise-800 hover:to-turquoise-700 transition flex-1 sm:flex-none font-medium flex items-center justify-center"
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