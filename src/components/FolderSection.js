// /src/components/FolderSection.js
import React from "react";

const FolderSection = React.memo(function FolderSection({
  selectedFolder,
  folderOptions,
  onFolderChange,
  accuracy,
  onNewRound,
  onRoundHistory,
}) {
  return (
    <div className="px-56 pb-10">
      <div className="flex items-center">
        {/* Folder Dropdown */}
        <select
          value={selectedFolder || ""}
          onChange={onFolderChange}
          className="p-3 border rounded-lg text-black w-60"
        >
          {folderOptions.map(({ key, value, label }) => (
            <option key={key} value={value}>
              {label}
            </option>
          ))}
        </select>
        {/* Accuracy Data */}
        <div className="pt-3 ml-10">
          <span className="text-black text-base">Accuracy: {accuracy}%</span>
        </div>
      </div>
      {/* Round Management Buttons Row - Aligned to the left */}
      <div className="mt-6 flex space-x-4 justify-start">
        <button 
          onClick={onNewRound}
          className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow hover:bg-gray-400 transition"
        >
          New Round
        </button>
        <button 
          onClick={onRoundHistory}
          className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow hover:bg-gray-400 transition"
        >
          Round History
        </button>
      </div>
    </div>
  );
});

export default FolderSection;