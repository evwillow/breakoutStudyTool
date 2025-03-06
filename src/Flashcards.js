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
 * - Auto-loading of the most recent in-progress round
 */
"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import ChartSection from "./components/ChartSection";
import ActionButtonsRow from "./components/ActionButtonsRow";
import FolderSection from "./components/FolderSection";
import AuthModal from "./components/AuthModal";
import RoundHistory from "./components/RoundHistory";
import AfterChartPopup from "./components/AfterChartPopup";
import supabase from "./config/supabase";
import DateFolderBrowser from "./components/DateFolderBrowser";
import LandingPage from "./components/LandingPage";
import TimeUpOverlay from "./components/TimeUpOverlay";

// Application constants
const INITIAL_TIMER = 60;
const actionButtons = ["-5%", "0%", "20%", "50%"];

// Create a global variable to store the setShowAuthModal function
// This allows the Header component to trigger the auth modal
// Safely check if window exists (for server-side rendering)
if (typeof window !== 'undefined') {
  window.openAuthModal = null;
}

export default function Flashcards() {
  const { data: session, status } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Timer duration state
  const [timerDuration, setTimerDuration] = useState(INITIAL_TIMER);

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
  const [showTimeUpOverlay, setShowTimeUpOverlay] = useState(false);
  const [timer, setTimer] = useState(timerDuration);
  const [timerPaused, setTimerPaused] = useState(false);
  const [timerReady, setTimerReady] = useState(true); // Start as ready initially
  const [showRoundHistory, setShowRoundHistory] = useState(false);
  
  // Store the last known timer value to prevent flashing to initial value
  const lastKnownTimerValue = useRef(timer);
  // Create a separate ref for the displayed timer value
  const displayedTimerValue = useRef(timer);
  
  // Update the ref whenever timer changes
  useEffect(() => {
    lastKnownTimerValue.current = timer;
    // Only update the displayed value when timer is ready
    if (timerReady) {
      displayedTimerValue.current = timer;
    }
  }, [timer, timerReady]);
  
  // After chart popup state
  const [showAfterChart, setShowAfterChart] = useState(false);
  const [afterChartData, setAfterChartData] = useState(null);

  // Ref for the action buttons section
  const actionButtonsRef = useRef(null);
  // Store the target end time for the timer
  const timerEndTimeRef = useRef(null);

  // Timer countdown effect: uses Page Visibility API to keep running in background
  useEffect(() => {
    if (!showTimeUpOverlay && !timerPaused) {
      // Set the end time if not already set
      if (!timerEndTimeRef.current) {
        timerEndTimeRef.current = Date.now() + lastKnownTimerValue.current * 1000;
      }

      // Function to update the timer based on the current time
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
        
        if (remaining <= 0) {
          setShowTimeUpOverlay(true);
          setTimer(0);
          displayedTimerValue.current = 0;
          timerEndTimeRef.current = null;
          return false; // Return false to stop the animation frame
        }
        
        setTimer(remaining);
        displayedTimerValue.current = remaining;
        setTimerReady(true);
        return true; // Continue the animation frame
      };

      // Set up visibility change detection
      let animationFrameId;
      let lastUpdateTime = Date.now();

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          // Tab is visible again, update the timer immediately
          const now = Date.now();
          
          // Use the end time reference to calculate the correct remaining time
          if (timerEndTimeRef.current) {
            // Calculate the correct remaining time
            const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));
            
            // Update the displayed timer value directly without changing the state yet
            displayedTimerValue.current = remaining;
            
            // Then update the timer state
            setTimer(remaining);
            
            if (remaining <= 0) {
              setShowTimeUpOverlay(true);
              timerEndTimeRef.current = null;
            } else {
              // Resume animation frame updates
              lastUpdateTime = now; // Reset the last update time
              tick();
            }
          }
        }
      };

      // Animation frame loop for smooth updates
      const tick = () => {
        const now = Date.now();
        // Update at most once per second to avoid unnecessary renders
        if (now - lastUpdateTime >= 1000) {
          lastUpdateTime = now;
          const shouldContinue = updateTimer();
          if (!shouldContinue) return;
        }
        animationFrameId = requestAnimationFrame(tick);
      };

      // Start the animation frame loop
      tick();

      // Add visibility change listener
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        // Clean up
        cancelAnimationFrame(animationFrameId);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else if (timerPaused || showTimeUpOverlay) {
      // Reset the end time reference when paused or overlay shown
      timerEndTimeRef.current = null;
    }
  }, [showTimeUpOverlay, timerPaused]);

  // Reset timer end time when timer duration changes
  useEffect(() => {
    if (!timerPaused && !showTimeUpOverlay) {
      timerEndTimeRef.current = Date.now() + lastKnownTimerValue.current * 1000;
    }
  }, [timerDuration, timerPaused, showTimeUpOverlay]);

  // Fetch folders on component mount.
  useEffect(() => {
    let mounted = true;
    async function fetchFolders() {
      try {
        const res = await fetch("/api/getFolders");
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Error fetching folders");
        }
        const data = await res.json();
        if (mounted && Array.isArray(data)) {
          setFolders(data);
          if (data.length > 0 && !selectedFolder) {
            setSelectedFolder(data[0].name);
          }
        }
      } catch (error) {
        console.error("Error fetching folders:", error);
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
          setTimer(timerDuration);
          
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
              console.error("Error creating initial round:", err);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching flashcards:", error);
        setError(error.message);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchFlashcards();
    return () => {
      mounted = false;
    };
  }, [selectedFolder, status, session, roundId, timerDuration]);

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

  // Extract after.csv data
  const afterCsvData = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.csvFiles) return null;
    
    const afterFile = currentSubfolder.csvFiles.find((file) =>
      file.fileName.toLowerCase().includes("after.csv")
    );
    
    if (!afterFile || !afterFile.data) {
      console.warn("after.csv file not found or has no data");
      return null;
    }
    
    return afterFile.data;
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

  // Generate points text array for the chart section.
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

  // Handle answer selection and log the match.
  const handleSelection = useCallback(
    async (selection) => {
      // Hide the time's up overlay if it's showing
      if (showTimeUpOverlay) {
        setShowTimeUpOverlay(false);
      }
      
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

      // Only log match if we have a valid roundId
      if (!roundId) {
        console.warn("No round ID available - match not logged. Create a new round first.");
        // Create a new round if one doesn't exist
        if (session?.user?.id && selectedFolder) {
          console.log("Automatically creating a new round since none exists");
          try {
            await createNewRound();
            // After creating a new round, try logging the match again with a delay
            // to ensure the state has been updated
            setTimeout(() => {
              if (roundId) {
                console.log("Retrying match logging with new round ID:", roundId);
                // Use a direct API call instead of recursively calling handleSelection
                const matchData = {
                  round_id: roundId,
                  stock_symbol: currentSubfolder ? currentSubfolder.name : "N/A",
                  user_selection: selection,
                  correct,
                  user_id: session?.user?.id,
                };
                
                fetch("/api/logMatch", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(matchData),
                }).then(response => {
                  if (!response.ok) {
                    console.error("Error logging match after creating new round");
                  } else {
                    console.log("Match logged successfully after creating new round");
                  }
                }).catch(err => {
                  console.error("Error calling log match API after creating new round:", err);
                });
              }
            }, 500);
          } catch (err) {
            console.error("Failed to create new round for match logging:", err);
          }
          return;
        }
      } else {
        // Log match via server-side API route instead of direct Supabase client.
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
            console.error("Error logging match via API:", result.error, result.details || "");
            
            // If the round doesn't exist in the database, create a new one
            if (response.status === 404 && result.error === "Round not found") {
              console.warn("Round not found in database. Creating a new round...");
              
              try {
                // Create a new round
                await createNewRound();
                
                // Wait a moment for the round to be created
                setTimeout(() => {
                  if (roundId) {
                    console.log("Retrying match logging with new round ID:", roundId);
                    // Update the match data with the new round ID
                    const updatedMatchData = {
                      ...matchData,
                      round_id: roundId
                    };
                    
                    // Try logging the match again
                    fetch("/api/logMatch", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify(updatedMatchData),
                    }).then(retryResponse => {
                      if (!retryResponse.ok) {
                        console.error("Error logging match after creating new round");
                      } else {
                        console.log("Match logged successfully after creating new round");
                      }
                    }).catch(retryErr => {
                      console.error("Error calling log match API after creating new round:", retryErr);
                    });
                  }
                }, 500);
              } catch (createErr) {
                console.error("Failed to create new round after round not found:", createErr);
              }
            }
          } else {
            if (result.warning) {
              console.warn("Match logged with warning:", result.warning);
            } else {
              console.log("Match logged successfully via API:", result);
            }
          }
        } catch (err) {
          console.error("Error calling log match API:", err);
        }
      }

      // Wait 1 second before showing the after chart
      setTimeout(() => {
        // Check if after.csv data exists
        if (afterCsvData) {
          setAfterChartData(afterCsvData);
          setShowAfterChart(true);
        } else {
          // If no after.csv data, proceed with the normal flow
          proceedToNextStock();
        }
      }, 1000);
    },
    [thingData, currentMatchIndex, currentSubfolder, roundId, session, afterCsvData, showTimeUpOverlay]
  );

  // Function to proceed to the next stock
  const proceedToNextStock = useCallback(() => {
    setFeedback(null);
    setDisableButtons(false);
    setTimer(timerDuration);
    setTimerPaused(false);
    if (currentMatchIndex < thingData.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else {
      setCurrentMatchIndex(0);
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }
  }, [currentMatchIndex, thingData, flashcards.length, timerDuration]);

  // Handle closing the after chart popup
  const handleAfterChartClose = useCallback(() => {
    setShowAfterChart(false);
    setAfterChartData(null);
    proceedToNextStock();
  }, [proceedToNextStock]);

  // Only calculate accuracy, removed win rate
  const accuracy = useMemo(() => {
    return matchCount > 0 ? ((correctCount / matchCount) * 100).toFixed(2) : "0.00";
  }, [correctCount, matchCount]);

  const createNewRound = async () => {
    // Wait until auth is fully loaded
    if (status === "loading") {
      console.log("Authentication is still loading, please wait...");
      return null;
    }
    
    // Check if user is authenticated
    if (status !== "authenticated" || !session) {
      console.log("You need to be signed in to create a round");
      setShowAuthModal(true);
      return null;
    }
    
    // Verify user ID exists
    if (!session.user?.id) {
      console.error("User ID not found in session");
      console.log("Session object:", session);
      return null;
    }
    
    // Check if folder is selected
    if (!selectedFolder) {
      console.error("No folder selected");
      alert("Please select a folder first");
      return null;
    }
    
    // End current round if exists
    if (roundId) {
      try {
        const response = await fetch(`/api/updateRound`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: roundId,
            completed: true
          }),
        });
        
        if (!response.ok) {
          console.warn("Failed to mark previous round as completed, but continuing anyway");
        }
      } catch (err) {
        console.error("Error updating previous round:", err);
        // Continue anyway
      }
    }
    
    try {
      console.log("Creating new round with dataset:", selectedFolder);
      
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
        console.error("Error creating round via API:", result.error, result.details || "");
        alert("Failed to create a new round. Please try again.");
        return null;
      }
      
      console.log("Round created successfully:", result.data);
      
      if (!result.data || !result.data.id) {
        console.error("No round ID returned from API");
        alert("Failed to create a new round. Please try again.");
        return null;
      }
      
      // Make sure to set the roundId here
      const newRoundId = result.data.id;
      setRoundId(newRoundId);
      setCurrentMatchIndex(0);
      setMatchCount(0);
      setCorrectCount(0);
      setTimer(timerDuration);
      
      console.log("New round started with ID:", newRoundId);
      return newRoundId;
    } catch (err) {
      console.error("Unexpected error creating round:", err);
      alert("An error occurred while creating a new round. Please try again.");
      return null;
    }
  };

  // Round history function
  const viewRoundHistory = async () => {
    setShowRoundHistory(true);
  };
  
  const loadRound = async (roundId, datasetName) => {
    if (!session?.user?.id) return;
    if (!roundId) {
      console.error("Cannot load round: No round ID provided");
      return;
    }
    
    setShowRoundHistory(false);
    
    // Show loading state
    setLoading(true);
    setError(null); // Clear any previous errors
    
    // If we're switching datasets, make sure to set the selected folder
    if (datasetName && datasetName !== selectedFolder) {
      console.log(`Setting selected folder to ${datasetName} for loaded round`);
      setSelectedFolder(datasetName);
      
      // We need to wait for the folder data to be loaded
      if (!flashcards || flashcards.length === 0) {
        try {
          const fileDataRes = await fetch(
            `/api/getFileData?folder=${encodeURIComponent(datasetName)}`
          );
          
          if (!fileDataRes.ok) {
            const errorData = await fileDataRes.json();
            throw new Error(errorData.message || "Error fetching file data");
          }
          
          const fileData = await fileDataRes.json();
          if (Array.isArray(fileData) && fileData.length > 0) {
            setFlashcards(fileData);
          } else {
            console.error("No flashcard data found for folder:", datasetName);
            setLoading(false);
            return;
          }
        } catch (fileError) {
          console.error("Error fetching flashcards for loaded round:", fileError);
          setLoading(false);
          return;
        }
      } else {
        // We need to wait for the folder to be selected and flashcards to be loaded
        await new Promise(resolve => {
          const checkFlashcardsLoaded = setInterval(() => {
            if (flashcards.length > 0) {
              clearInterval(checkFlashcardsLoaded);
              resolve();
            }
          }, 100);
          
          // Set a timeout to prevent infinite waiting
          setTimeout(() => {
            clearInterval(checkFlashcardsLoaded);
            resolve();
          }, 5000);
        });
      }
    }
    
    try {
      // Load the round data via API
      const response = await fetch(`/api/getRound?id=${roundId}`);
      const result = await response.json();
      
      if (!response.ok) {
        console.error("Error loading round:", result.error);
        setError(`Failed to load round: ${result.error}`);
        setLoading(false);
        return;
      }
      
      console.log("Loaded round data:", result);
      
      // Check if we have valid data from the API
      if (!result) {
        console.error("No data returned from API for round:", roundId);
        setError(`Failed to load round: No data returned`);
        setLoading(false);
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
      
      // Get metrics from the loaded data
      const totalMatches = result.matches.length;
      const correctMatches = result.matches.filter(match => match.correct).length;
      
      // Calculate accuracy for display
      const roundAccuracy = totalMatches > 0 
        ? ((correctMatches / totalMatches) * 100).toFixed(2) 
        : "0.00";
      
      console.log(`Loading round with ${correctMatches} correct out of ${totalMatches} total matches (${roundAccuracy}% accuracy)`);
      
      // Update state with the saved metrics
      setMatchCount(totalMatches);
      setCorrectCount(correctMatches);
      
      // Set the current index to continue from where left off
      setCurrentIndex(stockIndex >= 0 ? stockIndex : 0);
      setCurrentMatchIndex(stockIndex >= 0 ? stockIndex : 0);
      
      // Reset feedback and timer
      setFeedback(null);
      setTimer(timerDuration);
      setTimerPaused(false);
      setDisableButtons(false);
      
      // Log success message to console only
      const successMessage = `Round loaded successfully with ${roundAccuracy}% accuracy (${correctMatches}/${totalMatches} correct)`;
      console.log(successMessage);
      
      // Clear any previous errors
      setError(null);
      
      // Note: Success popup notification has been removed to improve user experience
    } catch (err) {
      console.error("Error loading round data:", err);
      setError(`Error loading round: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load the most recent in-progress round when the user is authenticated
  useEffect(() => {
    // Only run this effect when the user is authenticated and we don't have an active round
    if (status === "authenticated" && session?.user?.id && !roundId) {
      const autoLoadMostRecentRound = async () => {
        try {
          console.log("Attempting to auto-load the most recent in-progress round");
          
          // Fetch all user rounds
          const response = await fetch(`/api/getUserRounds?userId=${session.user.id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch user rounds");
          }
          
          const data = await response.json();
          
          // Find the most recent in-progress round
          const inProgressRounds = data.rounds.filter(round => !round.completed);
          
          if (inProgressRounds.length > 0) {
            // Sort by created_at (most recent first) - should already be sorted, but just to be safe
            inProgressRounds.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            const mostRecentRound = inProgressRounds[0];
            console.log("Auto-loading most recent in-progress round:", mostRecentRound);
            
            // First set the selected folder to ensure data is loaded
            if (mostRecentRound.dataset_name) {
              setSelectedFolder(mostRecentRound.dataset_name);
              
              // Wait for folder data to be fetched before loading the round
              // We'll fetch the flashcards data manually here to ensure it's loaded
              try {
                setLoading(true);
                const fileDataRes = await fetch(
                  `/api/getFileData?folder=${encodeURIComponent(mostRecentRound.dataset_name)}`
                );
                
                if (!fileDataRes.ok) {
                  const errorData = await fileDataRes.json();
                  throw new Error(errorData.message || "Error fetching file data");
                }
                
                const fileData = await fileDataRes.json();
                if (Array.isArray(fileData) && fileData.length > 0) {
                  setFlashcards(fileData);
                  
                  // Now that we have the folder data, load the round
                  try {
                    await loadRound(mostRecentRound.id, mostRecentRound.dataset_name);
                  } catch (loadError) {
                    console.error("Error loading round during auto-load:", loadError);
                    // If loading the round fails, create a new round instead
                    if (session?.user?.id) {
                      console.log("Creating new round after failed auto-load");
                      await createNewRound();
                    }
                  }
                } else {
                  console.error("No flashcard data found for folder:", mostRecentRound.dataset_name);
                }
              } catch (fileError) {
                console.error("Error fetching flashcards for auto-loaded round:", fileError);
              } finally {
                setLoading(false);
              }
            } else {
              console.error("No dataset_name found for round:", mostRecentRound);
            }
          } else {
            console.log("No in-progress rounds found to auto-load");
          }
        } catch (error) {
          console.error("Error auto-loading most recent round:", error);
        }
      };
      
      autoLoadMostRecentRound();
    }
  }, [status, session, roundId]); // Only run when authentication status changes or session changes

  // Store the setShowAuthModal function in the global variable
  useEffect(() => {
    // Safely check if window exists (for server-side rendering)
    if (typeof window !== 'undefined') {
      window.openAuthModal = () => setShowAuthModal(true);
      
      // Cleanup function to remove the global reference when component unmounts
      return () => {
        window.openAuthModal = null;
      };
    }
  }, []);

  // Handle timer duration change
  const handleTimerDurationChange = useCallback((newDuration) => {
    setTimerDuration(newDuration);
    setTimer(newDuration); // Reset current timer to new duration
    lastKnownTimerValue.current = newDuration; // Update the ref immediately
    displayedTimerValue.current = newDuration; // Update the displayed value immediately
    // Reset the timer end time when duration changes
    if (!timerPaused && !showTimeUpOverlay) {
      timerEndTimeRef.current = Date.now() + newDuration * 1000;
    }
  }, [timerPaused, showTimeUpOverlay]);

  // If user is not authenticated, show the landing page
  if (status !== "authenticated" || !session) {
    return (
      <>
        <LandingPage onSignIn={() => setShowAuthModal(true)} />
        {showAuthModal && (
          <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
        )}
      </>
    );
  }

  let content;
  if (status === "loading") {
    content = (
      <div className="flex justify-center items-center h-screen">
        <p className="text-black">Loading...</p>
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
      <div className="bg-soft-gray-50 min-h-screen w-full flex justify-center">
        <div className="w-full bg-soft-white rounded-lg shadow-lg p-0 sm:p-4 pb-0">
          <div className={showTimeUpOverlay ? 'filter blur-sm' : ''}>
            <ChartSection
              orderedFiles={orderedFiles}
              timer={displayedTimerValue.current}
              pointsTextArray={pointsTextArray}
              actionButtons={actionButtons}
              selectedButtonIndex={feedback ? thingData[currentMatchIndex] - 1 : null}
              feedback={feedback}
              onButtonClick={handleSelection}
              disabled={disableButtons}
            />
          </div>
          <div className={`pb-2 sm:pb-8 ${showTimeUpOverlay ? 'relative z-[45]' : ''}`} ref={actionButtonsRef}>
            <ActionButtonsRow
              actionButtons={actionButtons}
              selectedButtonIndex={feedback ? thingData[currentMatchIndex] - 1 : null}
              feedback={feedback}
              onButtonClick={handleSelection}
              disabled={disableButtons}
              isTimeUp={showTimeUpOverlay}
            />
          </div>
          <div className={showTimeUpOverlay ? 'filter blur-sm' : ''}>
            <FolderSection
              selectedFolder={selectedFolder}
              folderOptions={folderOptions}
              onFolderChange={handleFolderChange}
              accuracy={accuracy}
              onNewRound={createNewRound}
              onRoundHistory={viewRoundHistory}
              timerDuration={timerDuration}
              onTimerDurationChange={handleTimerDurationChange}
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
          </div>
          
          {showTimeUpOverlay && (
            <TimeUpOverlay 
              actionButtons={actionButtons}
              onSelect={handleSelection}
              actionButtonsRef={actionButtonsRef}
            />
          )}
          
          {showRoundHistory && (
            <RoundHistory
              isOpen={showRoundHistory}
              onClose={() => setShowRoundHistory(false)}
              onLoadRound={loadRound}
              userId={session?.user?.id}
            />
          )}
          
          {/* After Chart Popup */}
          <AfterChartPopup 
            isOpen={showAfterChart}
            onClose={handleAfterChartClose}
            afterCsvData={afterChartData}
            stockName={currentSubfolder ? currentSubfolder.name : 'Stock'}
          />
        </div>
      </div>
    );
  }

  return <>{content}</>;
}