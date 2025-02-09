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

  const currentSubfolder = useMemo(() => 
    flashcards.length > 0 ? flashcards[index] : null,
  [flashcards, index]);

  const folderOptions = useMemo(() => 
    folders.map(({ id, name }) => ({
      key: id,
      value: name,
      label: name
    })),
  [folders]);

  const getOrderedCSVFiles = useCallback((csvFiles) => {
    const files = new Map();
    for (const file of csvFiles) {
      const fileName = file.fileName;
      if (fileName.includes('D.csv')) files.set('D', file);
      else if (fileName.includes('H.csv')) files.set('H', file);
      else if (fileName.includes('M.csv')) files.set('M', file);
    }
    return ['D', 'H', 'M'].map(key => files.get(key)).filter(Boolean);
  }, []);

  const orderedFiles = useMemo(() => 
    currentSubfolder ? getOrderedCSVFiles(currentSubfolder.csvFiles) : [],
  [currentSubfolder, getOrderedCSVFiles]);

  const handleNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      index: (prev.index + 1) % prev.flashcards.length
    }));
  }, []);

  const handlePrevious = useCallback(() => {
    setState(prev => ({
      ...prev,
      index: (prev.index - 1 + prev.flashcards.length) % prev.flashcards.length
    }));
  }, []);

  const handleFolderChange = useCallback((e) => {
    const newFolder = e.target.value;
    setState(prev => ({
      ...prev,
      selectedFolder: newFolder,
      flashcards: [],
      index: 0,
      error: null,
      loading: true
    }));
  }, []);

  useEffect(() => {
    let mounted = true;

    fetch("/api/getFolders")
      .then(res => res.ok ? res.json() : Promise.reject(`Error fetching folders: ${res.status}`))
      .then(data => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setState(prev => ({
            ...prev,
            folders: data,
            selectedFolder: data[0]?.name || null
          }));
        }
      })
      .catch(err => mounted && setState(prev => ({ ...prev, error: err })));

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedFolder) return;
    
    let mounted = true;
    
    fetch(`/api/getFileData?folder=${encodeURIComponent(selectedFolder)}`)
      .then(res => res.ok ? res.json() : res.json().then(err => Promise.reject(err)))
      .then(data => {
        if (mounted && Array.isArray(data) && data.length > 0) {
          setState(prev => ({
            ...prev,
            flashcards: data,
            loading: false
          }));
        }
      })
      .catch(err => mounted && setState(prev => ({
        ...prev,
        error: err.message,
        loading: false
      })));

    return () => { mounted = false; };
  }, [selectedFolder]);

  const renderNavigationButtons = () => (
    <div className="mt-8 flex space-x-4">
      <button
        onClick={handlePrevious}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg"
      >
        Previous
      </button>
      <button
        onClick={handleNext}
        className="px-6 py-3 bg-gray-200 text-black rounded-lg hover:bg-gray-300 transition text-lg"
      >
        Next
      </button>
    </div>
  );

  const renderFolderSelect = () => (
    <div className="mt-6 w-full">
      <select
        value={selectedFolder || ""}
        onChange={handleFolderChange}
        className="p-3 border rounded-lg text-black w-60"
      >
        <option value="">Select a folder</option>
        {folderOptions.map(({ key, value, label }) => (
          <option key={key} value={value}>{label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="p-6 w-full max-w-6xl bg-white rounded-lg shadow-lg">
      {flashcards.length > 0 && !loading && currentSubfolder && (
        <div className="flex flex-col items-center w-full">
          <h2 className="text-lg font-bold mb-4 text-black">{currentSubfolder.folderName}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {orderedFiles.map((file, i) => (
              <div key={file.fileName} className="bg-white rounded-lg shadow p-4 border border-gray-300">
                <h3 className="text-md font-semibold mb-2 text-black">
                  {file.fileName.replace(".csv", "")}
                </h3>
                <div className="p-2 border border-black rounded-md w-full flex justify-center items-center">
                  <StockChart csvData={file.data} />
                </div>
              </div>
            ))}
          </div>

          {renderNavigationButtons()}
          <div className="w-full flex justify-start">{renderFolderSelect()}</div>
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
