// /src/Flashcards.js
"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import ChartSection from "./components/ChartSection";
import ActionButtonsRow from "./components/ActionButtonsRow";
import FolderSection from "./components/FolderSection";
import AuthModal from "./components/AuthModal";
import Popup from "./components/Popup";
import supabase from "./config/supabase";

const INITIAL_TIMER = 60;
const actionButtons = ["-5%", "0%", "20%", "50%"];

export default function Flashcards() {
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Round management & match metrics
  const [roundId, setRoundId] = useState(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [winCount, setWinCount] = useState(0);
  const [lossCount, setLossCount] = useState(0);
  const [feedback, setFeedback] = useState(null); // "correct" or "incorrect"
  const [disableButtons, setDisableButtons] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [timer, setTimer] = useState(INITIAL_TIMER);

  // Timer countdown that resets after each match.
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setShowPopup(true);
          return INITIAL_TIMER;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch folders on mount.
  useEffect(() => {
    let mounted = true;
    async function fetchFolders() {
      try {
        setLoading(true);
        const res = await fetch("/api/getFolders");
        if (!res.ok) throw new Error(`Error fetching folders: ${res.status}`);
        const data = await res.json();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setFolders(data);
          setSelectedFolder(data[0].name || null);
        }
      } catch (err) {
        if (mounted) setError(err.message || "Error fetching folders");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchFolders();
    return () => { mounted = false; };
  }, []);

  // Fetch flashcards when selectedFolder changes.
  useEffect(() => {
    if (!selectedFolder || status !== "authenticated" || !session) return;
    let mounted = true;
    async function fetchFlashcards() {
      try {
        setLoading(true);
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
          // Reset match metrics for the new folder.
          setCurrentMatchIndex(0);
          setMatchCount(0);
          setCorrectCount(0);
          setWinCount(0);
          setLossCount(0);
          setTimer(INITIAL_TIMER);
          // Create a new round (only if session exists).
          if (session.user && session.user.id) {
            const { data: newRoundData, error: roundError } = await supabase
              .from("rounds")
              .insert([
                { dataset_name: selectedFolder, user_id: session.user.id, completed: false },
              ])
              .select("id");
            if (roundError || !newRoundData || newRoundData.length === 0) {
              console.error("Error creating round:", roundError);
            } else {
              setRoundId(newRoundData[0].id);
            }
          } else {
            console.error("User not found in session; cannot create round.");
          }
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
    return () => { mounted = false; };
  }, [selectedFolder, session, status]);

  const currentSubfolder = flashcards[currentIndex] || null;

  // Extract ordered CSV files for charts (D.csv, H.csv, M.csv).
  const orderedFiles = useMemo(() => {
    if (currentSubfolder && currentSubfolder.csvFiles) {
      const files = new Map();
      for (const file of currentSubfolder.csvFiles) {
        const fileName = file.fileName;
        if (fileName.includes("D.csv")) files.set("D", file);
        else if (fileName.includes("H.csv")) files.set("H", file);
        else if (fileName.includes("M.csv")) files.set("M", file);
      }
      return ["D", "H", "M"].map((key) => files.get(key)).filter(Boolean);
    }
    return [];
  }, [currentSubfolder]);

  // Extract thing.csv data.
  const thingData = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.csvFiles) return [];
    const thingFile = currentSubfolder.csvFiles.find((file) =>
      file.fileName.toLowerCase().includes("thing.csv")
    );
    if (!thingFile || !thingFile.data) return [];
    return thingFile.data
      .trim()
      .split("\n")
      .map((line) => parseInt(line.trim(), 10))
      .filter((num) => !isNaN(num));
  }, [currentSubfolder]);

  // Extract points from points.csv.
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

  const handleFolderChange = useCallback((e) => {
    const newFolder = e.target.value;
    setSelectedFolder(newFolder);
    setFlashcards([]);
    setCurrentIndex(0);
    setError(null);
    setLoading(true);
  }, []);

  const folderOptions = useMemo(
    () =>
      folders.map(({ id, name }) => ({
        key: id,
        value: name,
        label: name,
      })),
    [folders]
  );

  // Handle button selection and log the match.
  const handleSelection = useCallback(
    async (selection) => {
      if (!thingData.length) return;
      setDisableButtons(true);
      const expected = thingData[currentMatchIndex];
      const correct = selection === expected;
      if (correct) setCorrectCount((prev) => prev + 1);
      if (selection === 3 || selection === 4) setWinCount((prev) => prev + 1);
      else if (selection === 1 || selection === 2) setLossCount((prev) => prev + 1);
      setFeedback(correct ? "correct" : "incorrect");
      setMatchCount((prev) => prev + 1);

      if (roundId) {
        const matchData = {
          round_id: roundId,
          stock_symbol: currentSubfolder ? currentSubfolder.name : "N/A",
          user_selection: selection,
          correct,
          user_id: session?.user?.id,
        };
        const { error: logError } = await supabase.from("matches").insert(matchData);
        if (logError) console.error("Error logging match:", logError);
      } else {
        console.error("Round ID is not set. Cannot log match.");
      }

      // Reset the timer.
      setTimer(INITIAL_TIMER);

      // After 5 seconds, clear feedback and move to the next match.
      setTimeout(() => {
        setFeedback(null);
        setDisableButtons(false);
        if (currentMatchIndex < thingData.length - 1) {
          setCurrentMatchIndex(currentMatchIndex + 1);
        } else {
          // When finishing all matches for this flashcard, move to the next flashcard.
          setCurrentMatchIndex(0);
          setCurrentIndex((prev) => (prev + 1) % flashcards.length);
        }
      }, 5000);
    },
    [thingData, currentMatchIndex, currentSubfolder, roundId, session, flashcards.length]
  );

  // When the timer expires via the Popup.
  const handlePopupSelect = (selection) => {
    setShowPopup(false);
    handleSelection(selection);
  };

  // Compute accuracy and win rate over all matches.
  const accuracy =
    matchCount > 0 ? ((correctCount / matchCount) * 100).toFixed(2) : "0.00";
  const totalDecisions = winCount + lossCount;
  const winRate =
    totalDecisions > 0 ? ((winCount / totalDecisions) * 100).toFixed(2) : "0.00";

  // Round management functions.
  const createNewRound = async () => {
    if (!session || !session.user || !session.user.id) {
      console.error("User not found in session; cannot create round.");
      return;
    }
    const { data: newRoundData, error: roundError } = await supabase
      .from("rounds")
      .insert([
        { dataset_name: selectedFolder, user_id: session.user.id, completed: false },
      ])
      .select("id");
    if (roundError || !newRoundData || newRoundData.length === 0) {
      console.error("Error creating round:", roundError);
    } else {
      setRoundId(newRoundData[0].id);
      // Reset match metrics.
      setCurrentMatchIndex(0);
      setMatchCount(0);
      setCorrectCount(0);
      setWinCount(0);
      setLossCount(0);
      setTimer(INITIAL_TIMER);
    }
  };

  const loadRound = async () => {
    alert("Load Round functionality not implemented.");
  };

  const viewRoundHistory = async () => {
    alert("Round History functionality not implemented.");
  };

  let content;
  if (status === "loading") {
    content = (
      <div className="flex justify-center items-center h-screen">
        <p className="text-black">Loading...</p>
      </div>
    );
  } else if (!session) {
    content = (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
        <p className="mb-4 text-2xl text-black">Please sign in to play the game.</p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="w-80 py-5 bg-gray-300 text-2xl text-black rounded shadow-xl hover:bg-gray-400 transition-colors"
        >
          Sign In
        </button>
        {showAuthModal && (
          <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
        )}
      </div>
    );
  } else if (loading) {
    content = (
      <div className="flex justify-center items-center h-96">
        <p className="text-black">Loading data...</p>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex justify-center items-center h-96">
        <p className="text-red-500">⚠️ {error}</p>
      </div>
    );
  } else if (
    !flashcards.length ||
    !currentSubfolder ||
    orderedFiles.length !== 3 ||
    thingData.length === 0
  ) {
    content = (
      <div className="flex justify-center items-center h-96">
        <p className="text-black">No flashcards or thing.csv available.</p>
      </div>
    );
  } else {
    content = (
      <div className="bg-gray-100 min-h-screen">
        <div className="w-full max-w-6xl bg-white rounded-lg shadow-lg mx-auto p-4">
          {/* Chart Section with integrated timer and points grid */}
          <ChartSection
            orderedFiles={orderedFiles}
            timer={timer}
            pointsTextArray={pointsTextArray}
          />
          {/* Action Buttons with original styling and padding below */}
          <div className="pb-8">
            <ActionButtonsRow
              actionButtons={actionButtons}
              selectedButtonIndex={feedback ? thingData[currentMatchIndex] - 1 : null}
              feedback={feedback}
              onButtonClick={handleSelection}
              disabled={disableButtons}
            />
          </div>
          {/* Folder Section (dropdown left of accuracy/win rate and round management buttons) */}
          <FolderSection
            selectedFolder={selectedFolder}
            folderOptions={folderOptions}
            onFolderChange={handleFolderChange}
            accuracy={accuracy}
            winRate={winRate}
          />
          {/* Popup for forced selection when timer expires */}
          {showPopup && <Popup onSelect={handlePopupSelect} />}
        </div>
      </div>
    );
  }

  return <>{content}</>;
}
