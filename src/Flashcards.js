// /src/Flashcards.js
"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import ChartSection from "./components/ChartSection";
import ActionButtonsRow from "./components/ActionButtonsRow";
import FolderSection from "./components/FolderSection";
import AuthModal from "./components/AuthModal";
import Popup from "./components/Popup";
import RoundHistory from "./components/RoundHistory";
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
  const [feedback, setFeedback] = useState(null); // "correct" or "incorrect"
  const [disableButtons, setDisableButtons] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [timer, setTimer] = useState(INITIAL_TIMER);
  const [timerPaused, setTimerPaused] = useState(false);
  const [showRoundHistory, setShowRoundHistory] = useState(false);

  // Timer countdown effect: runs only when not paused and no popup is shown.
  useEffect(() => {
    if (!showPopup && !timerPaused) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setShowPopup(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showPopup, timerPaused]);

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
    return () => {
      mounted = false;
    };
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
          setTimer(INITIAL_TIMER);
          
          // Only create a new round if there's no current round or if explicitly requested
          if (!roundId && session.user && session.user.id) {
            try {
              console.log("Creating initial round for user:", session.user.id);
              
              const { data: newRoundData, error: roundError } = await supabase
                .from("rounds")
                .insert([
                  { 
                    dataset_name: selectedFolder, 
                    user_id: session.user.id, 
                    completed: false 
                  },
                ])
                .select();
                
              if (roundError) {
                console.error("Error creating round:", roundError);
              } else if (!newRoundData || newRoundData.length === 0) {
                console.error("No round data returned after creation");
              } else {
                console.log("Round created successfully:", newRoundData[0]);
                setRoundId(newRoundData[0].id);
              }
            } catch (err) {
              console.error("Unexpected error creating round:", err);
            }
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
    return () => {
      mounted = false;
    };
  }, [selectedFolder, session, status, roundId]);

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

  // Handle answer selection and log the match.
  const handleSelection = useCallback(
    async (selection) => {
      if (!thingData.length) return;
      // Pause the timer until the glow effect is done.
      setTimerPaused(true);
      setDisableButtons(true);
      const expected = thingData[currentMatchIndex];
      const correct = selection === expected;
      if (correct) setCorrectCount((prev) => prev + 1);
      setFeedback(correct ? "correct" : "incorrect");
      setMatchCount((prev) => prev + 1);

      console.log("Current round ID:", roundId);
      console.log("Current user ID:", session?.user?.id);

      // Log match via server-side API route instead of direct Supabase client
      try {
        const matchData = {
          round_id: roundId,
          stock_symbol: currentSubfolder ? currentSubfolder.name : "N/A",
          user_selection: selection,
          correct,
          user_id: session?.user?.id,
        };
        
        console.log("Sending match data to API:", matchData);
        
        // Use fetch API to call a server-side endpoint for logging
        const response = await fetch("/api/logMatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(matchData),
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          console.error("Error logging match via API:", result.error);
        } else {
          console.log("Match logged successfully via API:", result);
        }
      } catch (err) {
        console.error("Error calling log match API:", err);
      }

      // Do not update the timer until the glow effect is finished.
      // After 5 seconds, clear feedback, unpause timer, reset timer, and advance.
      setTimeout(() => {
        setFeedback(null);
        setDisableButtons(false);
        setTimer(INITIAL_TIMER);
        setTimerPaused(false);
        if (currentMatchIndex < thingData.length - 1) {
          setCurrentMatchIndex(currentMatchIndex + 1);
        } else {
          setCurrentMatchIndex(0);
          setCurrentIndex((prev) => (prev + 1) % flashcards.length);
        }
      }, 5000);
    },
    [thingData, currentMatchIndex, currentSubfolder, roundId, session, flashcards.length]
  );

  const handlePopupSelect = (selection) => {
    setShowPopup(false);
    handleSelection(selection);
  };

  // Only calculate accuracy, removed win rate
  const accuracy =
    matchCount > 0 ? ((correctCount / matchCount) * 100).toFixed(2) : "0.00";

  const createNewRound = async () => {
    // Wait until auth is fully loaded
    if (status === "loading") {
      console.log("Authentication is still loading, please wait...");
      return;
    }
    
    // Check if user is authenticated
    if (status !== "authenticated" || !session) {
      console.log("You need to be signed in to create a round");
      setShowAuthModal(true);
      return;
    }
    
    // Verify user ID exists
    if (!session.user?.id) {
      console.error("User ID not found in session");
      console.log("Session object:", session);
      return;
    }
    
    // End current round if exists
    if (roundId) {
      await supabase
        .from("rounds")
        .update({ completed: true })
        .eq("id", roundId);
    }
    
    try {
      // Create a new round via server API route
      const response = await fetch("/api/createRound", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset_name: selectedFolder,
          user_id: session.user.id,
          completed: false
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error("Error creating round via API:", result.error);
        return;
      }
      
      console.log("Round created successfully:", result.data);
      
      // Make sure to set the roundId here
      setRoundId(result.data.id);
      setCurrentMatchIndex(0);
      setMatchCount(0);
      setCorrectCount(0);
      setTimer(INITIAL_TIMER);
    } catch (err) {
      console.error("Unexpected error creating round:", err);
    }
  };

  // Round history function
  const viewRoundHistory = async () => {
    setShowRoundHistory(true);
  };
  
  const loadRound = async (roundId, datasetName) => {
    if (!session?.user?.id) return;
    
    setShowRoundHistory(false);
    
    // First select the correct folder
    if (datasetName !== selectedFolder) {
      setSelectedFolder(datasetName);
    }
    
    try {
      // Load the round data via API
      const response = await fetch(`/api/getRound?id=${roundId}`);
      const result = await response.json();
      
      if (!response.ok) {
        console.error("Error loading round:", result.error);
        return;
      }
      
      // Set round ID
      setRoundId(roundId);
      
      // Calculate match index (to resume where left off)
      const uniqueStocks = [...new Set(result.matches.map(match => match.stock_symbol))];
      const lastStock = result.matches.length > 0 
        ? result.matches[result.matches.length - 1].stock_symbol 
        : null;
      const stockIndex = uniqueStocks.indexOf(lastStock);
      
      // Calculate metrics
      const totalMatches = result.matches.length;
      const correctMatches = result.matches.filter(match => match.correct).length;
      
      // Update state
      setMatchCount(totalMatches);
      setCorrectCount(correctMatches);
      setCurrentIndex(stockIndex >= 0 ? stockIndex : 0);
      setCurrentMatchIndex(stockIndex >= 0 ? stockIndex : 0);
    } catch (err) {
      console.error("Error loading round data:", err);
    }
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
          <ChartSection
            orderedFiles={orderedFiles}
            timer={timer}
            pointsTextArray={pointsTextArray}
          />
          <div className="pb-8">
            <ActionButtonsRow
              actionButtons={actionButtons}
              selectedButtonIndex={feedback ? thingData[currentMatchIndex] - 1 : null}
              feedback={feedback}
              onButtonClick={handleSelection}
              disabled={disableButtons}
            />
          </div>
          <FolderSection
            selectedFolder={selectedFolder}
            folderOptions={folderOptions}
            onFolderChange={handleFolderChange}
            accuracy={accuracy}
            onNewRound={createNewRound}
            onRoundHistory={viewRoundHistory}
          />
          {showPopup && <Popup onSelect={handlePopupSelect} />}
          {showRoundHistory && (
            <RoundHistory
              isOpen={showRoundHistory}
              onClose={() => setShowRoundHistory(false)}
              onLoadRound={loadRound}
              userId={session?.user?.id}
            />
          )}
        </div>
      </div>
    );
  }

  return <>{content}</>;
}