// src/components/FolderSection.js
import React from "react"

const FolderSection = React.memo(function FolderSection({
  selectedFolder,
  folderOptions,
  onFolderChange,
}) {
  return (
    <div className="mt-6 w-full flex flex-col items-start">
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

        {/* Data Showers */}
        <div className="flex flex-col ml-10">
          <div className="flex space-x-8">
            <span className="text-black text-base">Accuracy: (data %)</span>
            <span className="text-black text-base">Win rate: (data %)</span>
            <span className="text-black text-base">Win amount: (data %)</span>
          </div>
          <div className="flex space-x-8 mt-4">
            <span className="text-black text-base">Lose amount: (data %)</span>
          </div>
        </div>
      </div>

      {/* Round Buttons Row */}
      <div className="mt-6 flex space-x-4">
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
          New Round
        </button>
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
          Load Round
        </button>
        <button className="px-3 py-1 bg-gray-300 text-black border border-black rounded shadow">
          Round History
        </button>
      </div>
    </div>
  )
})

export default FolderSection
