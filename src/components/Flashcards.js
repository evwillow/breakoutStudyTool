"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
        } else {
          throw new Error("No folders found.");
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

    fetch(`/api/getImages?folder=${encodeURIComponent(selectedFolder)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((err) => Promise.reject(err));
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setFlashcards(data);
        } else {
          throw new Error("No flashcards found for this folder.");
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedFolder]);

  return (
    <div className="flex flex-col items-center p-6 w-full max-w-5xl mx-auto">
      {/* Flashcards Display */}
      {flashcards.length > 0 && !loading && (
        <div className="flex flex-col items-center w-full">
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            {flashcards[index].folderName}
          </h2>

          {/* Flashcards */}
          <div className="flex flex-wrap justify-center gap-4 w-full">
            {flashcards[index].images.map(({ url }, i) => (
              <div key={i} className="relative w-80 h-60 sm:w-96 sm:h-72">
                <Image
                  src={url}
                  alt={`Flashcard ${index + 1} - Image ${i + 1}`}
                  fill
                  className="object-contain rounded-lg shadow-lg"
                  onError={(e) => console.error("Image failed to load:", e.target.src)}
                />
              </div>
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setIndex((index - 1 + flashcards.length) % flashcards.length)}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-lg"
            >
              Previous
            </button>
            <button
              onClick={() => setIndex((index + 1) % flashcards.length)}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition text-lg"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Folder Selector at Bottom Left */}
      <div className="w-full flex justify-start mt-6">
        <select
          value={selectedFolder || ""}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="p-3 border rounded-lg text-gray-800 w-60"
        >
          <option value="">Select a folder</option>
          {folders.map(({ id, name }) => (
            <option key={id} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {loading && <p className="text-center text-gray-500 mt-4">Loading flashcards...</p>}
      {error && <p className="text-center text-red-500 mt-2">⚠️ {error}</p>}
    </div>
  );
}
