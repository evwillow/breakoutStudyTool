"use client";

import { useEffect, useState } from "react";
import StockChart from "./StockChart";

export default function Flashcards() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/getFolders")
      .then((res) => {
        if (!res.ok) throw new Error(`Error fetching folders: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFolders(data);
          setSelectedFolder(data[0]?.name || null);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedFolder) return;

    setLoading(true);
    setFlashcards([]);
    setIndex(0);
    setError(null);

    fetch(`/api/getFileData?folder=${encodeURIComponent(selectedFolder)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((err) => Promise.reject(err));
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFlashcards(data);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedFolder]);

  const handleNext = () => {
    setIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
  };

  const handlePrevious = () => {
    setIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
  };

  const currentSubfolder = flashcards[index];

  return (
    <div className="p-6 w-full max-w-6xl bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <select
          value={selectedFolder || ""}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="p-3 border rounded-lg text-gray-800 w-60"
        >
          <option value="">Select a folder</option>
          {folders.map(({ id, name }) => (
            <option key={id} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {flashcards.length > 0 && !loading && currentSubfolder && (
        <div className="flex flex-col items-center w-full">
          <h2 className="text-lg font-bold mb-4">{currentSubfolder.folderName}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            {currentSubfolder.csvFiles.map((file, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <h3 className="text-md font-semibold mb-2">{file.fileName}</h3>
                <StockChart csvData={file.data} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex space-x-4">
            <button
              onClick={handlePrevious}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-lg"
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-lg"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex justify-center items-center h-96">
          <p className="text-gray-500">Loading data...</p>
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