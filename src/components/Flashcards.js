"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import StockChart from "./StockChart";

const INITIAL_STATE = {
  folders: [],
  selectedFolder: null,
  flashcards: [],
  index: 0,
  loading: false,
  error: null
};

export default function Flashcards() {
  const [state, setState] = useState(INITIAL_STATE);
  const { folders, selectedFolder, flashcards, index, loading, error } = state;

  const currentSubfolder = useMemo(
    () => (flashcards.length > 0 ? flashcards[index] : null),
    [flashcards, index]
  );

  const folderOptions = useMemo(
    () => folders.map(({ id, name }) => ({ key: id, value: name, label: name })),
    [folders]
  );

  const getOrderedCSVFiles = useCallback((csvFiles) => {
    const files = new Map();
    for (const file of csvFiles) {
      const fileName = file.fileName;
      if (fileName.includes("D.csv")) files.set("D", file);
      else if (fileName.includes("H.csv")) files.set("H", file);
      else if (fileName.includes("M.csv")) files.set("M", file);
    }
    return ["D", "H", "M"].map((key) => files.get(key)).filter(Boolean);
  }, []);

  const orderedFiles = useMemo(
    () =>
      currentSubfolder && currentSubfolder.csvFiles
        ? getOrderedCSVFiles(currentSubfolder.csvFiles)
        : [],
    [currentSubfolder, getOrderedCSVFiles]
  );

  const handleNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      index: (prev.index + 1) % prev.flashcards.length
    }));
  }, []);

  const handlePrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      index: (prev.index - 1 + prev.flashcards.length) % prev.flashcards.length
    }));
  }, []);

  const handleFolderChange = useCallback((e) => {
    const newFolder = e.target.value;
    setState((prev) => ({
      ...prev,
      selectedFolder: newFolder,
      flashcards: [],
      index: 0,
      error: null,
      loading: true
    }));
  }, []);

  // Fetch folders on mount.
  useEffect(() => {
    let mounted = true;
    fetch("/api/getFolders")
      .then((res) =>
        res.ok ? res.json() : Promise.reject(`Error fetching folders: ${res.status}`)
      )
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setState((prev) => ({
            ...prev,
            folders: data,
            selectedFolder: data[0]?.name || null
          }));
        }
      })
      .catch((err) => mounted && setState((prev) => ({ ...prev, error: err })));
    return () => { mounted = false; };
  }, []);

  // Fetch CSV file data when a folder is selected.
  useEffect(() => {
    if (!selectedFolder) return;
    let mounted = true;
    fetch(`/api/getFileData?folder=${encodeURIComponent(selectedFolder)}`)
      .then((res) =>
        res.ok ? res.json() : res.json().then((err) => Promise.reject(err))
      )
      .then((data) => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setState((prev) => ({
            ...prev,
            flashcards: data,
            loading: false
          }));
        }
      })
      .catch((err) =>
        mounted &&
        setState((prev) => ({
          ...prev,
          error: err.message,
          loading: false
        }))
      );
    return () => { mounted = false; };
  }, [selectedFolder]);

  const renderNavigationButtons = () => (
    <div className="mt-8 flex justify-center">
      <button
        onClick={handlePrevious}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg mx-2"
      >
        Previous
      </button>
      <button
        onClick={handleNext}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg mx-2"
      >
        Next
      </button>
    </div>
  );

  const renderFolderSelect = () => (
    <div className="mt-6 w-full flex justify-start">
      <select
        value={selectedFolder || ""}
        onChange={handleFolderChange}
        className="p-3 border rounded-lg text-black w-60"
      >
        <option value="">Select a folder</option>
        {folderOptions.map(({ key, value, label }) => (
          <option key={key} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="p-6 w-full max-w-6xl bg-white rounded-lg shadow-lg">
      {flashcards.length > 0 && !loading && currentSubfolder && orderedFiles.length === 3 && (
        <div className="w-full">
          {/* The folder title is now moved to above the first chart only.
              To achieve the desired layout, the flex row contains three children.
              The first child (10/26 width) has extra top margin and includes the folder title above its chart.
              The second (8/26) and third (6/26) are aligned at the very top. */}
          <div className="flex flex-col md:flex-row gap-4 w-full items-start">
            {/* First Chart (moved down with title above it) */}
            <div
              className="flex flex-col items-center"
              style={{ flexBasis: `${(10 / 26) * 100}%` }}
            >
              <div className="w-full text-center">
                <h2 className="text-lg font-bold text-black">
                  {currentSubfolder.folderName}
                </h2>
              </div>
              <div className="w-full mt-6">
                <StockChart csvData={orderedFiles[0].data} />
              </div>
            </div>
            {/* Second Chart (aligned at top) */}
            <div
              className="flex flex-col items-center"
              style={{ flexBasis: `${(8 / 26) * 100}%` }}
            >
              <div className="w-full">
                <StockChart csvData={orderedFiles[1].data} />
              </div>
            </div>
            {/* Third Chart (aligned at top) */}
            <div
              className="flex flex-col items-center"
              style={{ flexBasis: `${(6 / 26) * 100}%` }}
            >
              <div className="w-full">
                <StockChart csvData={orderedFiles[2].data} />
              </div>
            </div>
          </div>
          {renderNavigationButtons()}
          {renderFolderSelect()}
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-96">
          <p className="text-black">Loading data...</p>
        </div>
      )}

      {error && (
        <div className="flex justify-center items-center h-96">
          <p className="text-red-500">⚠️ {error}</p>
        </div>
      )}
    </div>
  );
}
