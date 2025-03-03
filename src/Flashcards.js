/**
 * Flashcards.js
 * 
 * Main component for the stock trading flashcard application.
 * This component manages the core functionality including:
 * - Authentication state
 * - Folder and flashcard data fetching
 * - Round management and metrics tracking
 * - Timer functionality
 * - Chart display and user interactions
 */
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
import DateFolderBrowser from "./components/DateFolderBrowser";

// Application constants
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

  // Prevent scrolling when authentication is required
  useEffect(() => {
    if (!session && status !== "loading") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [session, status]);

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
    if (!currentSubfolder || !currentSubfolder.csvFiles) {
      console.warn("No current subfolder or CSV files available");
      return [];
    }
    
    try {
      const files = new Map();
      const requiredFiles = ["D.csv", "H.csv", "M.csv"];
      
      // Check if all required files are present
      for (const file of currentSubfolder.csvFiles) {
        if (!file.fileName || !file.data) {
          console.warn(`Invalid file object found: ${JSON.stringify(file)}`);
          continue;
        }
        
        const fileName = file.fileName.toUpperCase(); // Case-insensitive matching
        
        if (fileName.includes("D.CSV") || fileName.includes("D.csv")) {
          files.set("D", file);
        } else if (fileName.includes("H.CSV") || fileName.includes("H.csv")) {
          files.set("H", file);
        } else if (fileName.includes("M.CSV") || fileName.includes("M.csv")) {
          files.set("M", file);
        }
      }
      
      // Log warning if any required files are missing
      for (const requiredFile of requiredFiles) {
        const key = requiredFile.charAt(0);
        if (!files.has(key)) {
          console.warn(`Required file ${requiredFile} not found`);
        }
      }
      
      return ["D", "H", "M"].map((key) => files.get(key)).filter(Boolean);
    } catch (error) {
      console.error("Error processing ordered files:", error);
      return [];
    }
  }, [currentSubfolder]);

  // Extract thing.csv data.
  const thingData = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.csvFiles) return [];
    
    const thingFile = currentSubfolder.csvFiles.find((file) =>
      file.fileName.toLowerCase().includes("thing.csv")
    );
    
    if (!thingFile || !thingFile.data) {
      console.warn("thing.csv file not found or has no data");
      return [];
    }
    
    try {
      return thingFile.data
        .trim()
        .split("\n")
        .filter(line => line.trim()) // Filter out empty lines
        .map((line) => {
          const value = line.trim();
          const parsedValue = parseInt(value, 10);
          if (isNaN(parsedValue)) {
            console.warn(`Invalid numeric value in thing.csv: ${value}`);
            return null;
          }
          return parsedValue;
        })
        .filter((num) => num !== null);
    } catch (error) {
      console.error("Error processing thing.csv:", error);
      return [];
    }
  }, [currentSubfolder]);

  // Extract points from points.csv.
  const pointsTextArray = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.csvFiles) return [];
    
    const pointsFile = currentSubfolder.csvFiles.find(
      (file) => file.fileName.toLowerCase() === "points.csv"
    );
    
    if (!pointsFile || !pointsFile.data) {
      console.warn("points.csv file not found or has no data");
      return [];
    }
    
    try {
      return pointsFile.data
        .trim()
        .split("\n")
        .filter(line => line.trim()) // Filter out empty lines
        .map(line => line.trim());
    } catch (error) {
      console.error("Error processing points.csv:", error);
      return [];
    }
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
      <div 
        className="flex flex-col justify-center items-center w-full fixed inset-0 z-0"
        style={{ 
          background: 'linear-gradient(45deg, #a7f3d0 0%, #d1fae5 50%, #ffffff 100%)',
          backgroundSize: 'cover',
          overflow: 'hidden',
          paddingTop: 'var(--header-height, 64px)'
        }}
      >
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-lg shadow-2xl w-[90%] max-w-md mx-4 text-center transform hover:scale-[1.02] transition-all">
          <h1 className="text-3xl font-bold mb-2 text-black">Welcome</h1>
          <p className="mb-6 text-lg text-black">Please sign in to start your trading practice.</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full py-4 bg-white text-black text-xl font-semibold rounded-lg shadow-lg hover:bg-gray-100 transform hover:scale-[1.02] transition-all active:scale-95"
          >
            Sign In
          </button>
          <p className="mt-4 text-sm text-black">Practice with real market data</p>
        </div>
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
      <div className="bg-gray-100 min-h-screen w-full flex justify-center">
        <div className="w-full sm:w-[90%] md:w-[85%] lg:w-[80%] xl:w-[75%] bg-white rounded-lg shadow-lg p-0 sm:p-4 pb-0">
          <ChartSection
            orderedFiles={orderedFiles}
            timer={timer}
            pointsTextArray={pointsTextArray}
            actionButtons={actionButtons}
            selectedButtonIndex={feedback ? thingData[currentMatchIndex] - 1 : null}
            feedback={feedback}
            onButtonClick={handleSelection}
            disabled={disableButtons}
          />
          <div className="pb-2 sm:pb-8">
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
          
          {/* Date Folder Browser Section */}
          <div className="mt-8 pt-6 mb-20">
            {console.log("Current subfolder:", currentSubfolder)}
            <DateFolderBrowser 
              session={session} 
              currentStock={currentSubfolder && typeof currentSubfolder === 'object' ? 
                (currentSubfolder.name || 
                 (currentSubfolder.folderName) || 
                 (currentSubfolder.csvFiles && currentSubfolder.csvFiles[0] && currentSubfolder.csvFiles[0].fileName.split('_')[0])) 
                : null} 
            />
          </div>
          
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