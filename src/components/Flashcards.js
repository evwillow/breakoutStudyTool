// src/components/Flashcards.js
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

  // Fetch available folders on mount
  useEffect(() => {
    console.log('Fetching folders...');
    fetch("/api/getFolders")
      .then(async (res) => {
        console.log('Folders response status:', res.status);
        if (!res.ok) throw new Error(`Error fetching folders: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log('Folders data:', data);
        if (Array.isArray(data) && data.length > 0) {
          setFolders(data);
          setSelectedFolder(data[0]?.name || null);
        } else {
          throw new Error("No folders found.");
        }
      })
      .catch((err) => {
        console.error('Folders fetch error:', err);
        setError(err.message);
      });
  }, []);

  // Fetch flashcards when selected folder changes
  useEffect(() => {
    if (!selectedFolder) return;
    
    console.log('Fetching flashcards for folder:', selectedFolder);
    setLoading(true);
    setFlashcards([]);
    setIndex(0);
    setError(null);

    const apiUrl = `/api/getImages?folder=${encodeURIComponent(selectedFolder)}`;
    console.log('Fetching from:', apiUrl);

    fetch(apiUrl)
      .then(async (res) => {
        console.log('Flashcards response status:', res.status);
        if (!res.ok) {
          const errorData = await res.json();
          console.log('Error response data:', errorData);
          throw new Error(errorData.error || `Error fetching flashcards: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log('Flashcards data:', data);
        if (Array.isArray(data) && data.length > 0) {
          setFlashcards(data);
        } else {
          throw new Error("No flashcards found for this folder.");
        }
      })
      .catch((err) => {
        console.error('Flashcards fetch error:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [selectedFolder]);

  if (error) {
    return (
      <div className="flex flex-col items-center">
        <select
          value={selectedFolder || ""}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="mb-4 p-2 border rounded"
        >
          <option value="">Select a folder</option>
          {folders.map(folder => (
            <option key={folder.id} value={folder.name}>
              {folder.name}
            </option>
          ))}
        </select>
        <p className="text-center text-red-500">⚠️ {error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Folder Selection */}
      <select
        value={selectedFolder || ""}
        onChange={(e) => setSelectedFolder(e.target.value)}
        className="mb-4 p-2 border rounded"
      >
        <option value="">Select a folder</option>
        {folders.map(folder => (
          <option key={folder.id} value={folder.name}>
            {folder.name}
          </option>
        ))}
      </select>

      {/* Loading State */}
      {loading && (
        <p className="text-center text-gray-500">Loading flashcards...</p>
      )}

      {/* Flashcards Display */}
      {flashcards.length > 0 && !loading && (
        <>
          <h2 className="text-lg font-bold mb-4">
            {flashcards[index].folderName}
          </h2>
          <div className="flex space-x-4">
            {flashcards[index].images.map((image, i) => (
              <div key={i} className="relative w-64 h-48">
                <Image
                  src={image.url}
                  alt={`Flashcard ${index + 1} - Image ${i + 1}`}
                  fill
                  className="object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    console.error("Image failed to load:", e.target.src);
                  }}
                />
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => setIndex((index - 1 + flashcards.length) % flashcards.length)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              Previous
            </button>
            <button
              onClick={() => setIndex((index + 1) % flashcards.length)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}