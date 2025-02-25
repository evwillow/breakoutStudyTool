// /src/components/FolderSection.js
import React from "react";

const FolderSection = React.memo(function FolderSection({
  selectedFolder,
  folderOptions,
  onFolderChange,
  accuracy,
  winRate,
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
        {/* Accuracy and Win Rate Data */}
        <div className="pt-3 ml-10">
          <span className="text-black text-base">Accuracy: {accuracy}%</span>
          <span className="ml-5 text-black text-base">Win Rate: {winRate}%</span>
        </div>
      </div>
      {/* Round Management Buttons Row */}
      <div className="mt-6 pl-10 flex space-x-4">
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow hover:bg-gray-400 transition">
          New Round
        </button>
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow hover:bg-gray-400 transition">
          Load Round
        </button>
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow hover:bg-gray-400 transition">
          Round History
        </button>
      </div>
    </div>
  );
});

export default FolderSection;
