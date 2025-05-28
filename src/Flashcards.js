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
import supabase from "./config/supabase";
import DateFolderBrowser from "./components/DateFolderBrowser";
import LandingPage from "./components/LandingPage";

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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');

  // Utility function to detect mobile devices
  const isMobileDevice = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768 || 'ontouchstart' in window;
  }, []);

  // Add negative top margin to move the component closer to the header
  const containerStyle = { marginTop: "-20px" };

  // Timer duration state
  const [timerDuration, setTimerDuration] = useState(INITIAL_TIMER);

  // Round management & match metrics
  const [roundId, setRoundId] = useState(null);
  // Track if we're checking for existing rounds
  const [isCheckingExistingRounds, setIsCheckingExistingRounds] = useState(true);
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
  
  // State for after chart visualization (now displayed in-place instead of popup)
  const [afterChartData, setAfterChartData] = useState(null);

  // Ref for the action buttons section
  const actionButtonsRef = useRef(null);
  // Store the target end time for the timer
  const timerEndTimeRef = useRef(null);
  // Track if auto-load has been attempted to prevent multiple attempts
  const autoLoadAttempted = useRef(false);

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
          // Show the time's up overlay if timer reaches zero
          if (!timerPaused && !disableButtons && !feedback) {
            setShowTimeUpOverlay(true);
          }
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
              // Show time's up if timer reaches zero
              if (!timerPaused && !disableButtons && !feedback) {
                setShowTimeUpOverlay(true);
              }
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

  // useEffect specifically for handling afterChartData changes
  useEffect(() => {
    // Pause the timer when afterChartData is present (showing the "after" visualization)
    if (afterChartData) {
      setTimerPaused(true);
    }
  }, [afterChartData]);

  // Reset timer end time when timer duration changes
  useEffect(() => {
    if (!timerPaused && !showTimeUpOverlay) {
      timerEndTimeRef.current = Date.now() + lastKnownTimerValue.current * 1000;
    }
  }, [timerDuration, timerPaused, showTimeUpOverlay]);

  // Load roundId from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && session?.user?.id) {
      const savedRoundId = localStorage.getItem(`roundId_${session.user.id}`);
      if (savedRoundId) {
        console.log("Loaded roundId from localStorage:", savedRoundId);
        setRoundId(savedRoundId);
      }
    }
  }, [session]);

  // Save roundId to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && roundId && session?.user?.id) {
      console.log("Saving roundId to localStorage:", roundId);
      localStorage.setItem(`roundId_${session.user.id}`, roundId);
    }
  }, [roundId, session]);

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
        setLoadingProgress(0);
        setLoadingStep('Initializing...');
        
        const res = await fetch(
          `/api/getFileData?folder=${encodeURIComponent(selectedFolder)}`
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Error fetching file data");
        }
        setLoadingProgress(30);
        setLoadingStep('Loading flashcards...');
        
        const data = await res.json();
        if (mounted && Array.isArray(data) && data.length > 0) {
          setFlashcards(data);
          setLoadingProgress(60);
          setLoadingStep('Processing chart data...');
          
          setCurrentIndex(0);
          // Reset match metrics for the new folder.
          setCurrentMatchIndex(0);
          setMatchCount(0);
          setCorrectCount(0);
          setTimer(timerDuration);
          setLoadingProgress(90);
          setLoadingStep('Finalizing...');
          
          // Only create a new round if there's no current round or if explicitly requested
          // And we're not in the process of checking for existing rounds
          if (!roundId && session.user && session.user.id && !isCheckingExistingRounds) {
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
          setLoadingProgress(100);
        }
      } catch (error) {
        console.error("Error fetching flashcards:", error);
        setError(error.message);
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingProgress(0);
          setLoadingStep('');
        }
      }
    }
    fetchFlashcards();
    return () => {
      mounted = false;
    };
  }, [selectedFolder, status, session, roundId, timerDuration, isCheckingExistingRounds]);

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

  // Extract ordered JSON files for charts (D.json, H.json, M.json).
  const orderedFiles = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.jsonFiles) {
      // Remove warning, just return empty array silently
      return [];
    }
    
    try {
      const files = new Map();
      const requiredFiles = ["D.json", "H.json", "M.json"];
      
      // Check if all required files are present
      for (const file of currentSubfolder.jsonFiles) {
        if (!file.fileName || !file.data) {
          continue;
        }
        
        const fileName = file.fileName.toUpperCase(); // Case-insensitive matching
        
        if (fileName.includes("D.JSON") || fileName.includes("D.json")) {
          files.set("D", file);
        } else if (fileName.includes("H.JSON") || fileName.includes("H.json")) {
          files.set("H", file);
        } else if (fileName.includes("M.JSON") || fileName.includes("M.json")) {
          files.set("M", file);
        }
      }
      
      // Remove warnings for missing files - they're optional
      return ["D", "H", "M"].map((key) => files.get(key)).filter(Boolean);
    } catch (error) {
      console.error("Error processing ordered files:", error);
      return [];
    }
  }, [currentSubfolder]);

  // Extract after.json data
  const afterJsonData = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.jsonFiles) return null;
    
    const afterFile = currentSubfolder.jsonFiles.find((file) =>
      file.fileName.toLowerCase().includes("after.json")
    );
    
    if (!afterFile || !afterFile.data) {
      // Remove warning - after.json is optional
      return null;
    }
    
    return afterFile.data;
  }, [currentSubfolder]);

  // Extract thing.json data.
  const thingData = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.jsonFiles) return [];
    
    const thingFile = currentSubfolder.jsonFiles.find((file) =>
      file.fileName.toLowerCase().includes("thing.json")
    );
    
    if (!thingFile || !thingFile.data) {
      // Remove warning - thing.json is optional
      return [];
    }
    
    try {
      // The data is already parsed JSON from the API
      const jsonData = thingFile.data;
      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        return [];
      }
      
      // Extract the thing value from the first object
      const thingValue = jsonData[0].thing;
      if (typeof thingValue !== 'number') {
        return [];
      }
      
      return [thingValue];
    } catch (error) {
      console.error("Error processing thing.json:", error);
      return [];
    }
  }, [currentSubfolder]);

  // Generate points text array for the chart section.
  const pointsTextArray = useMemo(() => {
    if (!currentSubfolder || !currentSubfolder.jsonFiles) return [];
     
    const pointsFile = currentSubfolder.jsonFiles.find(
      (file) => file.fileName.toLowerCase() === "points.json"
    );
     
    if (!pointsFile || !pointsFile.data) {
      // Remove warning - points.json is optional
      return [];
    }
     
    try {
      // The data is already parsed JSON from the API
      const jsonData = pointsFile.data;
      if (!Array.isArray(jsonData)) {
        return [];
      }
      
      // Extract points values from each object
      return jsonData.map(item => {
        if (typeof item.points !== 'string') {
          return null;
        }
        return item.points;
      }).filter(Boolean);
    } catch (error) {
      console.error("Error processing points.json:", error);
      return [];
    }
  }, [currentSubfolder]);

  const createNewRound = useCallback(async () => {
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

    // Show loading state
    setLoading(true);
    setLoadingProgress(0);
    setLoadingStep('Creating new round...');
    
    try {
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
      
      setLoadingProgress(30);
      setLoadingStep('Initializing round data...');
      
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
      
      setLoadingProgress(70);
      setLoadingStep('Processing data...');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create a new round. Please try again.");
      }
      
      const result = await response.json();
      
      if (!result.data || !result.data.id) {
        throw new Error("No round ID returned from API");
      }
      
      // Make sure to set the roundId here
      const newRoundId = result.data.id;
      setRoundId(newRoundId);
      console.log("New round started with ID:", newRoundId);
      
      // Reset other state
      setCurrentMatchIndex(0);
      setMatchCount(0);
      setCorrectCount(0);
      setTimer(timerDuration);
      
      setLoadingProgress(100);
      setLoadingStep('Round created successfully!');
      
      // Short delay to show the success message
      setTimeout(() => {
        setLoading(false);
      }, 500);
      
      return newRoundId;
    } catch (err) {
      console.error("Unexpected error creating round:", err);
      setError(`Failed to create a new round: ${err.message}. Please try again.`);
      return null;
    } finally {
      // Ensure loading is always turned off
      setTimeout(() => {
        if (loading) {
          setLoading(false);
          setLoadingProgress(0);
          setLoadingStep('');
        }
      }, 1000);
    }
  }, [roundId, session, selectedFolder, status, timerDuration]);

  // Handle answer selection and log the match.
  const handleSelection = useCallback(
    async (selection) => {
      console.log("handleSelection called with selection:", selection);
      console.log("Current thingData:", thingData);
      console.log("Current matchIndex:", currentMatchIndex);
      
      // Hide the time's up overlay if it's showing
      if (showTimeUpOverlay) {
        setShowTimeUpOverlay(false);
      }
      
      if (!thingData.length) {
        console.error("No thingData available for comparison");
        return;
      }
      
      // Pause the timer until the glow effect is done.
      setTimerPaused(true);
      setDisableButtons(true);
      // Immediately reset the timer end time reference to prevent overlay from showing
      timerEndTimeRef.current = null;
      const expected = thingData[currentMatchIndex];
      console.log("Expected value:", expected);
      
      const correct = selection === expected;
      console.log("Is selection correct?", correct);
      
      if (correct) setCorrectCount((prev) => prev + 1);
      setFeedback(correct ? "correct" : "incorrect");
      setMatchCount((prev) => prev + 1);

      console.log("Current round ID:", roundId);
      console.log("Current user ID:", session?.user?.id);

      // Check if on a mobile device
      const isMobile = isMobileDevice();

      // Only log match if we have a valid roundId and session
      if (!roundId || !session?.user?.id) {
        console.warn("Missing round ID or user ID - creating a new round");
        
        // Create a new round if the user is authenticated and folder is selected
        if (session?.user?.id && selectedFolder) {
          try {
            console.log("Automatically creating a new round");
            const newRoundId = await createNewRound();
            
            // If a new round was successfully created
            if (newRoundId) {
              console.log("New round created with ID:", newRoundId);
              
              // Wait for state update
              setTimeout(() => {
                // Log the match with the new round ID
                const matchData = {
                  round_id: newRoundId, // Use the returned ID directly
                  stock_symbol: currentSubfolder ? currentSubfolder.name : "N/A",
                  user_selection: selection,
                  correct,
                  user_id: session?.user?.id,
                };
                
                console.log("Logging match with new round ID:", matchData);
                
                fetch("/api/logMatch", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(matchData),
                }).then(response => {
                  if (!response.ok) {
                    console.error("Error logging match after creating new round:", response.status);
                    response.json().then(data => console.error("Error details:", data));
                  } else {
                    console.log("Match logged successfully after creating new round");
                  }
                }).catch(err => {
                  console.error("Error calling log match API after creating new round:", err);
                });
              }, 500);
            } else {
              console.error("Failed to create new round - no round ID returned");
            }
          } catch (err) {
            console.error("Failed to create new round for match logging:", err);
          }
        } else {
          console.error("Cannot create round - missing user ID or folder selection");
        }
      } else {
        // Log match via server-side API route
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
          
          if (!response.ok) {
            // Get the error details from the response
            const errorData = await response.json();
            console.error("Error logging match via API:", errorData.error, errorData.details || "");
            
            // If the round doesn't exist in the database, create a new one
            if (response.status === 404 && errorData.error === "Round not found") {
              console.warn("Round not found in database. Creating a new round...");
              
              try {
                // Create a new round and get the new ID directly
                const newRoundId = await createNewRound();
                
                if (newRoundId) {
                  console.log("Successfully created new round with ID:", newRoundId);
                  
                  // Update the match data with the new round ID
                  const updatedMatchData = {
                    ...matchData,
                    round_id: newRoundId // Use the returned ID directly
                  };
                  
                  console.log("Retrying match logging with new round ID:", updatedMatchData);
                  
                  // Try logging the match again
                  const retryResponse = await fetch("/api/logMatch", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updatedMatchData),
                  });
                  
                  if (!retryResponse.ok) {
                    const retryError = await retryResponse.json();
                    console.error("Error logging match after creating new round:", retryError);
                  } else {
                    console.log("Match logged successfully after creating new round");
                  }
                } else {
                  console.error("Failed to create new round - no ID returned");
                }
              } catch (createErr) {
                console.error("Failed to create new round after round not found:", createErr);
              }
            }
          } else {
            const result = await response.json();
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
        // Check if after.json data exists
        if (afterJsonData) {
          // Add 1.5 second pause before starting the animation
          setTimeout(() => {
            setAfterChartData(afterJsonData);
            
            // If on mobile, scroll to top after 2.5 seconds to see the D chart
            if (isMobileDevice()) {
              setTimeout(() => {
                console.log("Mobile detected: Scrolling to top to view D chart");
                // First find any element with "D" label, which would be the D chart
                const dChartElement = document.querySelector('.bg-gradient-turquoise');
                
                if (dChartElement) {
                  // Get the chart's container for better positioning
                  const chartContainer = dChartElement.closest('.rounded-xl') || dChartElement;
                  const rect = chartContainer.getBoundingClientRect();
                  
                  // Scroll to position the D chart near the top of the viewport
                  window.scrollTo({
                    top: window.pageYOffset + rect.top - 100, // Position with some padding at top
                    behavior: 'smooth'
                  });
                } else {
                  // Fallback to scrolling to top if D chart not found
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                  });
                }
              }, 2500);
            }
            
            // Set a timeout to automatically proceed to next stock after 13 seconds
            setTimeout(() => {
              proceedToNextStock();
            }, 13000); // 13 seconds to give time to observe the completed chart
          }, 1500); // 1.5 second pause before starting the animation
        } else {
          // If no after.json data, proceed with the normal flow
          proceedToNextStock();
        }
      }, 1000);
    },
    [thingData, currentMatchIndex, currentSubfolder, roundId, session, afterJsonData, showTimeUpOverlay, selectedFolder, createNewRound]
  );

  // Function to proceed to the next stock
  const proceedToNextStock = useCallback(() => {
    setFeedback(null);
    setDisableButtons(false);
    setTimer(timerDuration);
    setTimerPaused(false);
    setShowTimeUpOverlay(false); // Ensure the time's up overlay is not shown when proceeding to next stock
    setAfterChartData(null); // Reset the after chart data
    
    // Make sure timer end time is set correctly for the new timer
    if (timerDuration > 0) {
      timerEndTimeRef.current = Date.now() + timerDuration * 1000;
    }
    
    if (currentMatchIndex < thingData.length - 1) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else {
      setCurrentMatchIndex(0);
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }

    // Check if on mobile and scroll to top with a short delay
    const isMobile = isMobileDevice();
    if (isMobile) {
      // Small delay to allow state updates to complete
      setTimeout(() => {
        console.log("Mobile detected: Scrolling to top on stock transition");
        
        // First find any element with "D" label, which would be the D chart
        const dChartElement = document.querySelector('.bg-gradient-turquoise');
        
        if (dChartElement) {
          // Get the chart's container for better positioning
          const chartContainer = dChartElement.closest('.rounded-xl') || dChartElement;
          const rect = chartContainer.getBoundingClientRect();
          
          // Scroll to position the D chart near the top of the viewport
          window.scrollTo({
            top: window.pageYOffset + rect.top - 100, // Position with some padding at top
            behavior: 'smooth'
          });
        } else {
          // Fallback to scrolling to top if D chart not found
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
      }, 200); // Slightly longer delay to ensure the DOM has updated
    }
  }, [currentMatchIndex, thingData, flashcards.length, timerDuration, isMobileDevice]);

  // Only calculate accuracy, removed win rate
  const accuracy = useMemo(() => {
    return matchCount > 0 ? ((correctCount / matchCount) * 100).toFixed(2) : "0.00";
  }, [correctCount, matchCount]);

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
    if (status === "authenticated" && session?.user?.id && !autoLoadAttempted.current) {
      // Mark that we've attempted auto-load to prevent duplicates
      autoLoadAttempted.current = true;
      
      setIsCheckingExistingRounds(true);
      const autoLoadMostRecentRound = async () => {
        try {
          console.log("Attempting to auto-load the most recent in-progress round");
          setLoading(true);
          setLoadingProgress(0);
          setLoadingStep('Checking for saved rounds...');
          
          // Fetch all user rounds
          const response = await fetch(`/api/getUserRounds?userId=${session.user.id}`);
          if (!response.ok) {
            throw new Error("Failed to fetch user rounds");
          }
          setLoadingProgress(20);
          
          const data = await response.json();
          
          // Find the most recent in-progress round
          const inProgressRounds = data.rounds && Array.isArray(data.rounds) 
            ? data.rounds.filter(round => !round.completed)
            : [];
          
          if (inProgressRounds.length > 0) {
            // Sort by created_at (most recent first)
            inProgressRounds.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            const mostRecentRound = inProgressRounds[0];
            console.log("Auto-loading most recent in-progress round:", mostRecentRound);
            setLoadingProgress(40);
            setLoadingStep('Loading saved round...');
            
            // First set the selected folder to ensure data is loaded
            if (mostRecentRound.dataset_name) {
              setSelectedFolder(mostRecentRound.dataset_name);
              
              // Wait for folder data to be fetched before loading the round
              try {
                setLoadingProgress(60);
                setLoadingStep('Fetching dataset files...');
                
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
                  setLoadingProgress(80);
                  setLoadingStep('Restoring round state...');
                  
                  // Now that we have the folder data, load the round
                  try {
                    await loadRound(mostRecentRound.id, mostRecentRound.dataset_name);
                    setLoadingProgress(100);
                    setLoadingStep('Ready!');
                  } catch (loadError) {
                    console.error("Error loading round during auto-load:", loadError);
                    // If loading the round fails, create a new round instead
                    if (session?.user?.id) {
                      console.log("Creating new round after failed auto-load");
                      await createNewRound();
                    }
                  }
                } else {
                  throw new Error(`Dataset "${mostRecentRound.dataset_name}" not found or is empty`);
                }
              } catch (fileError) {
                console.error("Error fetching flashcards for auto-loaded round:", fileError);
                setError(`Unable to load dataset "${mostRecentRound.dataset_name}". Please select a different dataset.`);
              }
            } else {
              throw new Error("No dataset name found for the saved round");
            }
          } else {
            setLoadingProgress(100);
            setLoadingStep('No saved rounds found');
            console.log("No in-progress rounds found to auto-load");
          }
        } catch (error) {
          console.error("Error auto-loading most recent round:", error);
          setError(error.message || "Failed to load saved round. Please select a dataset to begin.");
        } finally {
          setLoading(false);
          setLoadingProgress(0);
          setLoadingStep('');
          // We're done checking for existing rounds
          setIsCheckingExistingRounds(false);
        }
      };
      
      autoLoadMostRecentRound();
    } else if (status !== "loading") {
      // If we're not authenticated or already attempted, we're not checking for existing rounds
      setIsCheckingExistingRounds(false);
    }
  }, [status, session?.user?.id]); // Simplified dependency array

  // Reset auto-load flag when user signs out
  useEffect(() => {
    if (status === "unauthenticated") {
      autoLoadAttempted.current = false;
    }
  }, [status]);

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
    console.log(`Timer duration changed to ${newDuration} seconds`);
    // Ensure newDuration is a positive number
    newDuration = Math.max(1, Number(newDuration));
    
    setTimerDuration(newDuration);
    setTimer(newDuration); // Reset current timer to new duration
    setTimerReady(true); // Ensure timer is marked as ready
    
    // Update refs
    lastKnownTimerValue.current = newDuration;
    displayedTimerValue.current = newDuration;
    
    // Reset the timer end time when duration changes
    if (!timerPaused && !showTimeUpOverlay) {
      timerEndTimeRef.current = Date.now() + newDuration * 1000;
    }
  }, [timerPaused, showTimeUpOverlay]);

  // Add a beforeunload event handler to mark the round as completed when page is closed
  useEffect(() => {
    const handleBeforeUnload = async () => {
      // Mark the current round as completed if it exists
      if (roundId && session?.user?.id) {
        try {
          console.log("Marking round as completed on page unload:", roundId);
          
          // Clear the localStorage roundId to prevent auto-loading a completed round
          localStorage.removeItem(`roundId_${session.user.id}`);
          
          // Use the fetch API to update the round status
          navigator.sendBeacon(
            '/api/updateRound',
            JSON.stringify({
              id: roundId,
              completed: true
            })
          );
        } catch (err) {
          console.error("Error marking round as completed on unload:", err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roundId, session]);

  // Add keyboard shortcut handling
  useEffect(() => {
    // Skip setup if essential conditions aren't met
    if (!flashcards.length) return;
    
    const handleKeyDown = (e) => {
      // Get the current state of buttons
      const areButtonsDisabled = disableButtons && !showTimeUpOverlay;
      
      // Only handle number keys 1-4
      if (e.key >= '1' && e.key <= '4') {
        const selection = parseInt(e.key);
        
        // Check if button exists and is selectable
        if (selection >= 1 && selection <= 4) {          
          // Only trigger selection if buttons aren't disabled (game is active)
          if (!areButtonsDisabled && handleSelection) {
            handleSelection(selection);
            e.preventDefault();
          } else if (showTimeUpOverlay) {
            // If time is up
            handleSelection(selection);
            e.preventDefault();
          }
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disableButtons, showTimeUpOverlay, flashcards.length, handleSelection]);

  // Simplified header handling when time's up
  useEffect(() => {
    // No need to modify header z-index with our simpler implementation
    // Just let CSS handle it naturally with fixed positioning
  }, [showTimeUpOverlay]);

  // Handle scrolling to action buttons when time's up
  useEffect(() => {
    if (showTimeUpOverlay && actionButtonsRef.current) {
      // Function to scroll to and highlight the action buttons
      const scrollToActionButtons = () => {
        // Check if actionButtonsRef.current exists before accessing properties
        if (!actionButtonsRef.current) return;
        
        // Get the button container's position
        const buttonRect = actionButtonsRef.current.getBoundingClientRect();
        
        // Calculate the scroll position to center the buttons vertically in the viewport
        const viewportHeight = window.innerHeight;
        
        // Center the buttons exactly in the middle of the screen
        const targetPosition = window.pageYOffset + buttonRect.top - (viewportHeight / 2) + (buttonRect.height / 2);
        
        // Scroll to the buttons
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Highlight the buttons with subtle effects
        const buttons = actionButtonsRef.current.querySelectorAll('button');
        buttons.forEach(button => {
          button.style.transition = 'all 0.3s ease-in-out';
          button.style.transform = 'scale(1.02)'; // Slightly increased scale for better visibility on mobile
          button.style.boxShadow = '0 0 12px 4px rgba(45, 212, 191, 0.4)'; // Enhanced glow for mobile visibility
          button.style.zIndex = '50';
          button.style.position = 'relative';
          button.style.margin = '0 1px'; // Minimal margin
        });
      };
      
      // Scroll immediately first, then again after a short delay to ensure it works
      scrollToActionButtons();
      
      // Use multiple timeouts to ensure proper scrolling on different devices and screen sizes
      setTimeout(scrollToActionButtons, 100);
      setTimeout(scrollToActionButtons, 300);
      
      // Add resize listener to maintain button position
      window.addEventListener('resize', scrollToActionButtons);
      
      // Handle orientation change specifically for mobile devices
      window.addEventListener('orientationchange', () => {
        // Wait for orientation change to complete
        setTimeout(scrollToActionButtons, 200);
      });
      
      // Clean up
      return () => {
        window.removeEventListener('resize', scrollToActionButtons);
        window.removeEventListener('orientationchange', scrollToActionButtons);
        
        // Reset button styles when time-up is dismissed
        if (actionButtonsRef.current) {
          const buttons = actionButtonsRef.current.querySelectorAll('button');
          buttons.forEach(button => {
            button.style.transform = '';
            button.style.boxShadow = '';
            button.style.zIndex = '';
            button.style.position = '';
            button.style.margin = '';
          });
        }
      };
    }
  }, [showTimeUpOverlay]);

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
        <p className="text-white">Loading...</p>
      </div>
    );
  } else if (loading) {
    content = (
      <div className="flex flex-col justify-center items-center h-96 space-y-6 p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto border border-gray-300 mt-20">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-blue-500 font-semibold">{loadingProgress}%</span>
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-gray-800">Loading Dataset</h2>
          <p className="text-gray-600">{loadingStep}</p>
          {selectedFolder && (
            <p className="text-sm text-gray-500">Folder: {selectedFolder}</p>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
      </div>
    );
  } else if (error) {
    content = (
      <div className="flex flex-col justify-center items-center h-96 space-y-4 p-8 bg-black rounded-lg shadow-lg max-w-md mx-auto border border-white">
        <div className="text-red-500 text-4xl mb-2">⚠️</div>
        <h2 className="text-xl font-semibold text-white">Error Loading Data</h2>
        <p className="text-gray-300 text-center">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            setSelectedFolder(null);
            setFlashcards([]);
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  } else if (
    !flashcards.length ||
    !currentSubfolder ||
    orderedFiles.length === 0 ||
    thingData.length === 0
  ) {
    content = (
      <div className="flex flex-col justify-center items-center h-96 space-y-4 p-8 bg-black rounded-lg shadow-lg max-w-md mx-auto border border-white">
        <h2 className="text-xl font-semibold text-white">No Data Available</h2>
        <p className="text-gray-300 text-center">Please select a dataset to begin practicing.</p>
        <button 
          onClick={() => {
            setSelectedFolder(null);
            setFlashcards([]);
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Select Dataset
        </button>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen w-full flex justify-center items-center p-4 sm:p-8" style={{ background: 'var(--background)' }}>
        <div className="w-full max-w-7xl bg-black rounded-3xl shadow-2xl overflow-hidden border border-white">
          <div>
            <ChartSection
              orderedFiles={orderedFiles}
              afterData={afterChartData}
              timer={displayedTimerValue.current}
              pointsTextArray={pointsTextArray}
              actionButtons={actionButtons}
              selectedButtonIndex={feedback ? thingData[currentMatchIndex] - 1 : null}
              feedback={feedback}
              onButtonClick={handleSelection}
              disabled={disableButtons}
              isTimeUp={showTimeUpOverlay}
            />
          </div>
          {/* Action buttons row */}
          <div className="pb-2 sm:pb-8 relative" ref={actionButtonsRef}>
            <ActionButtonsRow
              actionButtons={actionButtons}
              selectedButtonIndex={feedback ? thingData[currentMatchIndex] - 1 : null}
              feedback={feedback}
              onButtonClick={handleSelection}
              disabled={showTimeUpOverlay ? false : disableButtons}
              isTimeUp={showTimeUpOverlay}
            />
          </div>
          <div>
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
                   (currentSubfolder.jsonFiles && currentSubfolder.jsonFiles[0] && currentSubfolder.jsonFiles[0].fileName.split('_')[0])) 
                  : null} 
                isTimeUp={showTimeUpOverlay}
              />
            </div>
          </div>
          
          {/* Time's Up Notification */}
          {showTimeUpOverlay && (
            <div className="fixed inset-x-0 top-[80px] sm:top-[120px] flex justify-center z-50 pointer-events-none px-4">
              <div className="pointer-events-auto bg-black bg-opacity-90 border-2 border-turquoise-500 shadow-xl rounded-lg px-6 sm:px-8 py-3 sm:py-4 animate-pulse-slow max-w-[90%] sm:max-w-md mx-auto">
                <div className="text-center">
                  <h2 className="text-2xl sm:text-2xl font-bold mb-1 text-turquoise-500 animate-glow">Time's Up!</h2>
                  <p className="text-white opacity-90 text-base sm:text-lg">Please make your selection</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Add animation keyframes to global styles */}
          <style jsx global>{`
            @keyframes pulse-slow {
              0%, 100% {
                opacity: 1;
                box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.7);
                transform: scale(1);
              }
              50% {
                opacity: 0.95;
                box-shadow: 0 0 15px 10px rgba(45, 212, 191, 0.35);
                transform: scale(1.02);
              }
            }
            
            @keyframes glow {
              0%, 100% {
                text-shadow: 0 0 8px rgba(45, 212, 191, 0.7);
                letter-spacing: normal;
              }
              50% {
                text-shadow: 0 0 20px rgba(45, 212, 191, 1);
                letter-spacing: 0.5px;
              }
            }
            
            .animate-pulse-slow {
              animation: pulse-slow 2s infinite;
            }
            
            .animate-glow {
              animation: glow 2s infinite;
            }
          `}</style>
          
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

  return <div style={containerStyle}>{content}</div>;
}