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
    <div className="px-1 sm:px-8 md:px-16 lg:px-24 xl:px-56 pb-2 sm:pb-6 md:pb-10 border-t border-gray-200 pt-2 sm:pt-0 sm:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center">
        {/* Folder selection dropdown */}
        <select
          value={selectedFolder || ""}
          onChange={onFolderChange}
          className="p-3 sm:p-2 md:p-3 border rounded-lg text-black w-full sm:w-60 mb-1 sm:mb-0 text-base sm:text-sm md:text-base h-12 sm:h-auto"
        >
          {folderOptions.map(({ key, value, label }) => (
            <option key={key} value={value}>
              {label}
            </option>
          ))}
        </select>
        {/* Accuracy statistics display */}
        <div className="pt-0 sm:pt-1 md:pt-3 sm:ml-10">
          <span className="text-black text-base sm:text-base md:text-lg font-medium">Accuracy: {accuracy}%</span>
        </div>
      </div>
      {/* Round management controls */}
      <div className="mt-1 sm:mt-4 md:mt-6 flex flex-wrap gap-1 sm:gap-2 sm:space-x-0 md:space-x-4 justify-start">
        <button 
          onClick={onNewRound}
          className="px-3 sm:px-3 py-2 sm:py-1 bg-gray-300 text-black text-sm sm:text-sm md:text-base border border-black rounded shadow hover:bg-gray-400 transition flex-1 sm:flex-none font-medium"
        >
          New Round
        </button>
        <button 
          onClick={onRoundHistory}
          className="px-3 sm:px-3 py-2 sm:py-1 bg-gray-300 text-black text-sm sm:text-sm md:text-base border border-black rounded shadow hover:bg-gray-400 transition flex-1 sm:flex-none font-medium"
        >
          Round History
        </button>
      </div>
    </div>
  );
});

export default FolderSection;