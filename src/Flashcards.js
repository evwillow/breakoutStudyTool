// src/Flashcards.js
"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import ChartSection from "./components/ChartSection";
import ActionButtonsRow from "./components/ActionButtonsRow";
import FolderSection from "./components/FolderSection";
import NavigationButtons from "./components/NavigationButtons";

const INITIAL_TIMER = 60;
const actionButtons = ["-5%", "0%", "20%", "50%"];

// Utility function to order CSV files based on file name.
const getOrderedCSVFiles = (csvFiles) => {
  const files = new Map();
  for (const file of csvFiles) {
    const fileName = file.fileName;
    if (fileName.includes("D.csv")) files.set("D", file);
    else if (fileName.includes("H.csv")) files.set("H", file);
    else if (fileName.includes("M.csv")) files.set("M", file);
  }
  return ["D", "H", "M"].map((key) => files.get(key)).filter(Boolean);
};

export default function Flashcards() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(INITIAL_TIMER);

  // Timer countdown effect.
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch folders on mount.
  useEffect(() => {
    let mounted = true;
    async function fetchFolders() {
      try {
        const res = await fetch("/api/getFolders");
        if (!res.ok) throw new Error(`Error fetching folders: ${res.status}`);
        const data = await res.json();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setFolders(data);
          setSelectedFolder(data[0].name || null);
        }
      } catch (err) {
        if (mounted) setError(err.message || "Error fetching folders");
      }
    }
    fetchFolders();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch CSV file data when selectedFolder changes.
  useEffect(() => {
    if (!selectedFolder) return;
    let mounted = true;
    async function fetchFlashcards() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/getFileData?folder=${encodeURIComponent(selectedFolder)}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Error fetching file data");
        }
        const data = await res.json();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setFlashcards(data);
          setCurrentIndex(0);
        } else if (mounted) {
          setFlashcards([]);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchFlashcards();
    return () => {
      mounted = false;
    };
  }, [selectedFolder]);

  // Get the current flashcard (subfolder).
  const currentSubfolder = flashcards[currentIndex] || null;

  // Get ordered CSV files for the current subfolder.
  const orderedFiles = useMemo(() => {
    if (currentSubfolder && currentSubfolder.csvFiles) {
      return getOrderedCSVFiles(currentSubfolder.csvFiles);
    }
    return [];
  }, [currentSubfolder]);

  // Process points text from "points.csv" if available.
  const pointsTextArray = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.csvFiles) return [];
    const pointsFile = currentSubfolder.csvFiles.find(
      (file) => file.fileName.toLowerCase() === "points.csv"
    );
    if (!pointsFile || !pointsFile.data) return [];
    return pointsFile.data
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }, [currentSubfolder]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) =>
      flashcards.length ? (prev + 1) % flashcards.length : 0
    );
  }, [flashcards]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) =>
      flashcards.length ? (prev - 1 + flashcards.length) % flashcards.length : 0
    );
  }, [flashcards]);

  const handleFolderChange = useCallback((e) => {
    const newFolder = e.target.value;
    setSelectedFolder(newFolder);
    setFlashcards([]);
    setCurrentIndex(0);
    setError(null);
    setLoading(true);
  }, []);

  const folderOptions = useMemo(
    () => folders.map(({ id, name }) => ({ key: id, value: name, label: name })),
    [folders]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-black">Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-red-500">⚠️ {error}</p>
      </div>
    );
  }

  if (!flashcards.length || !currentSubfolder || orderedFiles.length !== 3) {
    return (
      <div className="flex justify-center items-center h-96">
        <p className="text-black">No flashcards available.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg mx-auto">
        <ChartSection
          orderedFiles={orderedFiles}
          timer={timer}
          pointsTextArray={pointsTextArray}
        />
        <ActionButtonsRow actionButtons={actionButtons} />
        <FolderSection
          selectedFolder={selectedFolder}
          folderOptions={folderOptions}
          onFolderChange={handleFolderChange}
        />
        <NavigationButtons onPrevious={handlePrevious} onNext={handleNext} />
      </div>
    </div>
  );
}
