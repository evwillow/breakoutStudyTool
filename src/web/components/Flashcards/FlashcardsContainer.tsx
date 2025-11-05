/**
 * Flashcards Container
 * 
 * Optimized main component for the stock trading flashcard application.
 * This replaces the monolithic 1567-line component with a clean, modular structure.
 * 
 * Key improvements:
 * - Separated concerns into focused custom hooks
 * - Eliminated memory leaks from timer management
 * - Reduced re-renders through proper memoization
 * - Improved error handling and loading states
 * - Better TypeScript support
 */

"use client";

import React, { useMemo, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";

// Components
import { 
  ChartSection, 
  FolderSection, 
  RoundHistory, 
  DateFolderBrowser, 
  LandingPage 
} from "../";
import { AuthModal } from "../Auth";
import { LoadingStates } from "./components/LoadingStates";

// Hooks
import { useFlashcardData } from "./hooks/useFlashcardData";
import { useGameState } from "./hooks/useGameState";
import { useTimer } from "./hooks/useTimer";

// Utils
import { processFlashcardData, extractStockName, FlashcardData } from "./utils/dataProcessors";
import { GAME_CONFIG, UI_CONFIG, TIMER_CONFIG } from "./constants";

// Type the imported JS components
const TypedChartSection = ChartSection as React.ComponentType<any>;
const TypedFolderSection = FolderSection as React.ComponentType<any>;

export default function FlashcardsContainer() {
  const { data: session, status } = useSession();
  
  // Data management
  const {
    folders,
    flashcards,
    selectedFolder,
    loading,
    loadingProgress,
    loadingStep,
    error,
    setSelectedFolder,
    clearError,
  } = useFlashcardData({
    autoSelectFirstFolder: true,
  });

  // UI state (must be defined before gameState so callbacks can use them)
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showRoundHistory, setShowRoundHistory] = React.useState(false);
  const [roundHistoryRefresh, setRoundHistoryRefresh] = React.useState<(() => void) | null>(null);
  const [timerDuration, setTimerDuration] = React.useState<number>(TIMER_CONFIG.INITIAL_DURATION);
  const [currentRoundId, setCurrentRoundId] = React.useState<string | null>(null);
  const [isCreatingRound, setIsCreatingRound] = React.useState(false);
  const [isLoadingRounds, setIsLoadingRounds] = React.useState(false);
  const [availableRounds, setAvailableRounds] = React.useState<any[]>([]);
  const [showRoundSelector, setShowRoundSelector] = React.useState(false);
  const [lastMatchLogTime, setLastMatchLogTime] = React.useState<number>(0);
  const [matchLogCount, setMatchLogCount] = React.useState<number>(0);
  const [refreshCount, setRefreshCount] = React.useState<number>(0);
  
  // Ref to store handleNextCard for timer callback
  const handleNextCardRef = React.useRef<(() => void) | null>(null);

  // Create a more reliable refresh function
  const triggerRoundHistoryRefresh = useCallback(() => {
    const currentRefreshCount = refreshCount + 1;
    setRefreshCount(currentRefreshCount);
    
    // Capture the refresh function to ensure it's available when setTimeout callback runs
    const refreshFn = roundHistoryRefresh;
    
    if (refreshFn && typeof refreshFn === 'function') {
      // Add a longer delay to ensure database has time to commit
      // Also add a random delay to avoid race conditions
      const delay = 1000 + Math.random() * 500; // 1-1.5 seconds
      
      setTimeout(() => {
        // Double-check the function is still valid before calling
        if (refreshFn && typeof refreshFn === 'function') {
          refreshFn();
        }
      }, delay);
    }
  }, [roundHistoryRefresh, lastMatchLogTime, matchLogCount, refreshCount]);

  // Game state management (initialize with flashcards length)
  const gameState = useGameState({
    flashcardsLength: flashcards.length,
    onCorrectAnswer: useCallback(() => {
      // Answer logged
    }, []),
    onIncorrectAnswer: useCallback(() => {
      // Answer logged
    }, []),
    onGameComplete: useCallback(async () => {
      
      // Mark round as completed if we have a round ID
      if (currentRoundId) {
        try {
          const response = await fetch(`/api/game/rounds/${currentRoundId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              completed: true,
            }),
          });

          let result;
          let responseText: string = '';
          try {
            responseText = await response.text();
            if (!responseText) {
              console.error('Failed to update round: Empty response body', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                roundId: currentRoundId,
              });
              return;
            }
            try {
              result = JSON.parse(responseText);
            } catch (parseError) {
              console.error('Failed to update round: Invalid JSON response', {
                status: response.status,
                statusText: response.statusText,
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
                responseText: responseText.substring(0, 200),
                url: response.url,
                roundId: currentRoundId,
              });
              return;
            }
          } catch (readError) {
            console.error('Failed to update round: Could not read response', {
              status: response.status,
              statusText: response.statusText,
              readError: readError instanceof Error ? readError.message : String(readError),
              url: response.url,
              roundId: currentRoundId,
            });
            return;
          }

          if (!response.ok) {
            // API returns: { success: false, error: { code, message, details, validationErrors } }
            const error = result?.error || {};
            const errorMessage = error?.message || error?.details || result?.message || `HTTP ${response.status}: ${response.statusText}`;
            const errorCode = error?.code || `HTTP_${response.status}`;
            const validationErrors = error?.validationErrors || null;
            
            console.error('Failed to mark round as completed', {
              status: response.status,
              statusText: response.statusText,
              message: errorMessage || 'Unknown error',
              code: errorCode || 'UNKNOWN_ERROR',
              validationErrors: validationErrors || undefined,
              fullResult: result || null,
              roundId: currentRoundId,
            });
          } else {
            // Use the new refresh mechanism
            triggerRoundHistoryRefresh();
          }
        } catch (error) {
          console.error('Error updating round completion:', {
            error: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            roundId: currentRoundId,
          });
        }
      }
    }, [currentRoundId, triggerRoundHistoryRefresh]),
  });

  // Compute current flashcard using gameState's currentIndex
  // This ensures proper synchronization when transitioning between stocks
  const currentFlashcard = useMemo(() => {
    const index = gameState.currentIndex;
    // Ensure index is within bounds
    const safeIndex = Math.max(0, Math.min(index, flashcards.length - 1));
    const flashcard = flashcards[safeIndex] || null;
    
    // If index was out of bounds, reset it
    if (index !== safeIndex && flashcards.length > 0) {
      console.warn(`⚠️ Current index ${index} out of bounds, resetting to ${safeIndex}`);
      gameState.setCurrentIndex(safeIndex);
    }
    
    return flashcard;
  }, [gameState.currentIndex, flashcards, gameState]);

  // Process current flashcard data
  const processedData = useMemo(() => {
    const result = processFlashcardData(currentFlashcard);
    return result;
  }, [currentFlashcard, gameState.currentIndex]);


  // Timer management - normal timer behavior, no auto-advance on time up
  const timer = useTimer({
    initialDuration: TIMER_CONFIG.INITIAL_DURATION,
    onTimeUp: useCallback(() => {
      gameState.setShowTimeUpOverlay(true);
      // Timer expired - show overlay but don't auto-advance
    }, [gameState]),
    autoStart: false,
  });

  // Track last loaded folder/userId to prevent repeated calls
  const lastLoadedRef = React.useRef<{folder: string|null, userId: string|null}>({folder: null, userId: null});

  // Create a new round in the database
  const createNewRound = useCallback(async () => {
    if (!session?.user?.id || !selectedFolder) {
      console.warn('Cannot create round: missing user ID or selected folder', {
        hasUserId: !!session?.user?.id,
        selectedFolder
      });
      return null;
    }

    setIsCreatingRound(true);
    
    try {
      const requestData = {
        dataset_name: selectedFolder,
        user_id: session.user.id,
        completed: false,
      };

      const response = await fetch('/api/game/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      let result;
      let responseText: string = '';
      try {
        responseText = await response.text();
        if (!responseText) {
          console.error('Failed to create round: Empty response body', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            requestData,
          });
          return null;
        }
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to create round: Invalid JSON response', {
            status: response.status,
            statusText: response.statusText,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            responseText: responseText.substring(0, 200),
            url: response.url,
            requestData,
          });
          return null;
        }
      } catch (readError) {
        console.error('Failed to create round: Could not read response', {
          status: response.status,
          statusText: response.statusText,
          readError: readError instanceof Error ? readError.message : String(readError),
          url: response.url,
          requestData,
        });
        return null;
      }

      if (!response.ok) {
        // API returns: { success: false, error: { code, message, details, validationErrors } }
        const error = result?.error || {};
        const errorMessage = error?.message || error?.details || result?.message || `HTTP ${response.status}: ${response.statusText}`;
        const errorCode = error?.code || `HTTP_${response.status}`;
        const validationErrors = error?.validationErrors || null;
        
        console.error('Round creation failed', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage || 'Unknown error',
          code: errorCode || 'UNKNOWN_ERROR',
          validationErrors: validationErrors || undefined,
          fullResult: result || null,
          requestData,
        });
        // Don't block the game from starting, just log the error
        return null;
      }

      return result.data?.id || null;
    } catch (error) {
      console.error('Error creating round:', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        userId: session.user.id,
        selectedFolder
      });
      // Don't block the game from starting, just log the error
      return null;
    } finally {
      setIsCreatingRound(false);
    }
  }, [session?.user?.id, selectedFolder]);

  // Load recent rounds for the current dataset
  const loadRecentRounds = useCallback(async (datasetName: string) => {
    if (!session?.user?.id || !datasetName) {
      return;
    }

    setIsLoadingRounds(true);
    try {
      const url = `/api/game/rounds?userId=${session.user.id}&datasetName=${encodeURIComponent(datasetName)}&limit=5`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to load rounds:', result.error);
        setAvailableRounds([]);
        return;
      }

      const rounds = result.data || [];
      
      setAvailableRounds(rounds);

      // Auto-load the most recent incomplete round
      const mostRecentIncomplete = rounds.find((round: any) => !round.completed);
      
      if (mostRecentIncomplete) {
        setCurrentRoundId(mostRecentIncomplete.id);
        // Load matches for this round to initialize game state
        try {
          const matchResponse = await fetch(`/api/game/matches?roundId=${mostRecentIncomplete.id}`);
          if (matchResponse.ok) {
            const matchResult = await matchResponse.json();
            const matches = matchResult.data || [];
            if (matches.length > 0) {
              gameState.initializeFromMatches(matches);
            }
          }
        } catch (error) {
          console.error('Error loading matches for auto-loaded round:', error);
        }
      } else if (rounds.length > 0) {
        setShowRoundSelector(true);
      } else {
        // Automatically create a new round when none exist
        const newRoundId = await createNewRound();
        if (newRoundId) {
          setCurrentRoundId(newRoundId);
        } else {
          setShowRoundSelector(true);
        }
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
      setAvailableRounds([]);
      // Try to create a new round even if loading fails
      const newRoundId = await createNewRound();
      if (newRoundId) {
        setCurrentRoundId(newRoundId);
      } else {
        setShowRoundSelector(true);
      }
    } finally {
      setIsLoadingRounds(false);
    }
  }, [session?.user?.id, createNewRound, gameState]);

  // Handle folder change
  const handleFolderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFolder = e.target.value;
    setSelectedFolder(newFolder);
    // Reset game state BEFORE clearing flashcards to ensure clean state
    gameState.resetGame();
    // Reset timer to current duration setting
    timer.reset(timerDuration);
    setCurrentRoundId(null);
    setShowRoundSelector(false);
    
    // Load recent rounds for the new folder
    if (newFolder && session?.user?.id) {
      loadRecentRounds(newFolder);
    }
  }, [setSelectedFolder, gameState, timer, timerDuration, session?.user?.id, loadRecentRounds]);

  // Handle timer duration change
  const handleTimerDurationChange = useCallback((duration: number) => {
    setTimerDuration(duration);
    timer.setDuration(duration);
  }, [timer]);

  // Handle creating a new round
  const handleNewRound = useCallback(async () => {
    if (!selectedFolder) {
      return;
    }

    const roundId = await createNewRound();
    
    // Reset game and timer regardless of round creation result
    gameState.resetGame();
    timer.reset(timerDuration);
    
    if (roundId) {
      setCurrentRoundId(roundId);
      setShowRoundSelector(false);
    } else {
      console.error('Failed to create round - no round ID returned');
      // Still allow the game to start even if round creation fails
      setShowRoundSelector(false);
    }
  }, [selectedFolder, createNewRound, gameState, timer, timerDuration]);

  // Handle selecting an existing round
  const handleSelectRound = useCallback(async (roundId: string) => {
    setCurrentRoundId(roundId);
    setShowRoundSelector(false);
    
    // Reset game state first
    gameState.resetGame();
    timer.reset(timerDuration);
    
    // Fetch existing matches for this round and initialize game state
    try {
      const response = await fetch(`/api/game/matches?roundId=${roundId}`);
      
      if (response.ok) {
        const result = await response.json();
        const matches = result.data || [];
        
        // Initialize game state with existing matches
        if (matches.length > 0) {
          gameState.initializeFromMatches(matches);
        }
      } else {
        console.error('Failed to fetch matches for round:', roundId);
      }
    } catch (error) {
      console.error('Error fetching matches for round:', error);
    }
  }, [gameState, timer, timerDuration]);

  // Handle next card with smooth transition
  const handleNextCard = useCallback(() => {
    // Pause timer first
    timer.pause();
    
    // Reset game state - this clears all selection state (including feedback)
    gameState.nextCard();
    
    // Reset timer to the current duration setting
    timer.reset(timerDuration);
    
    // Start timer for the new card after a small delay to ensure state resets
    // nextCard() clears feedback synchronously, so it should be null by now
    setTimeout(() => {
      timer.start();
    }, 250);
  }, [gameState, timer, timerDuration]);
  
  // Store handleNextCard in ref for timer callback
  React.useEffect(() => {
    handleNextCardRef.current = handleNextCard;
  }, [handleNextCard]);

  // Log match to database
  const logMatch = useCallback(async (buttonIndex: number, isCorrect: boolean) => {
    if (!currentRoundId || !currentFlashcard || !session?.user?.id) {
      return; // Don't log if no active round or missing data
    }

    // Validate round ID format (must be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentRoundId)) {
      return;
    }

    // Extract stock symbol from current flashcard
    const stockSymbol = extractStockName(currentFlashcard) || 'UNKNOWN';

    const matchData = {
      round_id: currentRoundId,
      stock_symbol: stockSymbol,
      user_selection: buttonIndex,
      correct: isCorrect,
    };


    try {
      const response = await fetch('/api/game/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      let result;
      let responseText: string = '';
      try {
        responseText = await response.text();
        if (!responseText) {
          console.error('Failed to log match: Empty response body', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
          });
          return;
        }
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to log match: Invalid JSON response', {
            status: response.status,
            statusText: response.statusText,
            parseError: parseError instanceof Error ? parseError.message : String(parseError),
            responseText: responseText.substring(0, 200),
            url: response.url,
          });
          return;
        }
      } catch (readError) {
        console.error('Failed to log match: Could not read response', {
          status: response.status,
          statusText: response.statusText,
          readError: readError instanceof Error ? readError.message : String(readError),
          url: response.url,
        });
        return;
      }

      if (!response.ok) {
        // API returns: { success: false, error: { code, message, details, validationErrors } }
        const error = result?.error || {};
        const errorMessage = error?.message || error?.details || result?.message || `HTTP ${response.status}: ${response.statusText}`;
        const errorCode = error?.code || `HTTP_${response.status}`;
        const validationErrors = error?.validationErrors || null;
        
        console.error('Failed to log match', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage || 'Unknown error',
          code: errorCode || 'UNKNOWN_ERROR',
          validationErrors: validationErrors || undefined,
          fullResult: result || null,
          matchData: {
            round_id: matchData.round_id,
            stock_symbol: matchData.stock_symbol,
            user_selection: matchData.user_selection,
            correct: matchData.correct,
          },
        });
      } else {
        // Update match log tracking
        setLastMatchLogTime(Date.now());
        setMatchLogCount(prev => prev + 1);
        triggerRoundHistoryRefresh();
      }
    } catch (error) {
      console.error('Error logging match:', error instanceof Error ? error.message : String(error));
    }
  }, [currentRoundId, currentFlashcard, session?.user?.id, triggerRoundHistoryRefresh]);

  // Handle selection with timer integration and match logging
  const handleSelection = useCallback((buttonIndex: number) => {
    gameState.handleSelection(buttonIndex, (isCorrect: boolean) => {
      logMatch(buttonIndex, isCorrect);
    });
    timer.pause();
  }, [gameState, timer, logMatch]);

  // Calculate target point and ranges from data
  const { targetPoint, priceRange, timeRange } = useMemo(() => {
    if (!processedData.afterJsonData || !Array.isArray(processedData.afterJsonData) || processedData.afterJsonData.length === 0) {
      return { targetPoint: null, priceRange: null, timeRange: null };
    }
    
    const mainData = processedData.orderedFiles[0]?.data || [];
    const mainDataLength = mainData.length;
    
    // Find peak close price in after data
    let maxClose = -Infinity;
    let maxIndex = -1;
    let maxPrice = 0;
    
    processedData.afterJsonData.forEach((point: any, index: number) => {
      const close = point.close || point.Close || point.CLOSE;
      if (close && typeof close === 'number' && close > maxClose) {
        maxClose = close;
        maxIndex = index;
        maxPrice = close;
      }
    });
    
    if (maxIndex === -1) return { targetPoint: null, priceRange: null, timeRange: null };
    
    // Calculate price range from all data (main + after)
    const allPrices: number[] = [];
    mainData.forEach((point: any) => {
      const close = point.close || point.Close || point.CLOSE;
      if (close && typeof close === 'number') allPrices.push(close);
    });
    processedData.afterJsonData.forEach((point: any) => {
      const close = point.close || point.Close || point.CLOSE;
      if (close && typeof close === 'number') allPrices.push(close);
    });
    
    const priceMin = Math.min(...allPrices);
    const priceMax = Math.max(...allPrices);
    const pricePadding = (priceMax - priceMin) * 0.2; // 20% padding for extended selection
    
    // Calculate time range (extend beyond current data to allow future predictions)
    const totalTimePoints = mainDataLength + processedData.afterJsonData.length;
    const timeMin = 0;
    const timeMax = totalTimePoints * 1.5; // Extend 50% beyond for future predictions
    const timeIndex = mainDataLength + maxIndex;
    
    return {
      targetPoint: {
        x: timeIndex,
        y: maxPrice,
        chartX: 0,
        chartY: 0,
      },
      priceRange: {
        min: priceMin - pricePadding,
        max: priceMax + pricePadding,
      },
      timeRange: {
        min: timeMin,
        max: timeMax,
      }
    };
  }, [processedData.afterJsonData, processedData.orderedFiles]);

  // Handle chart coordinate selection
  const handleChartClick = useCallback((coordinates: { x: number; y: number; chartX: number; chartY: number }) => {
    if (!targetPoint || !priceRange || !timeRange) {
      return;
    }
    
    // Verify selection is after the last data point
    const mainDataLength = processedData.orderedFiles[0]?.data?.length || 0;
    
    if (coordinates.x <= mainDataLength - 1) {
      // Selection is not in the future - don't process
      return;
    }
    
    gameState.handleCoordinateSelection(
      coordinates,
      (distance: number, score: number, scoreData?: any) => {
        // Log match with coordinates
        const stockSymbol = extractStockName(currentFlashcard) || 'UNKNOWN';
        const isCorrect = scoreData?.priceAccuracy >= 70 || score >= 70;
        
        logMatchWithCoordinates({
          coordinates,
          targetPoint,
          distance,
          score,
          stockSymbol,
          isCorrect,
          priceAccuracy: scoreData?.priceAccuracy,
          timePosition: scoreData?.timePosition,
          priceError: scoreData?.priceError,
          timeError: scoreData?.timeError,
        });
      },
      targetPoint,
      priceRange,
      timeRange
    );
    timer.pause();
  }, [gameState, timer, targetPoint, priceRange, timeRange, currentFlashcard, processedData]);

  // Log match with coordinates
  const logMatchWithCoordinates = useCallback(async (data: {
    coordinates: { x: number; y: number };
    targetPoint: { x: number; y: number };
    distance: number;
    score: number;
    stockSymbol: string;
    isCorrect: boolean;
    priceAccuracy?: number;
    timePosition?: number;
    priceError?: number;
    timeError?: number;
  }) => {
    if (!currentRoundId || !session?.user?.id) return;

    const matchData = {
      round_id: currentRoundId,
      stock_symbol: data.stockSymbol,
      user_selection_x: data.coordinates.x,
      user_selection_y: data.coordinates.y,
      target_x: data.targetPoint.x,
      target_y: data.targetPoint.y,
      distance: data.distance,
      score: data.score,
      correct: data.isCorrect,
      // New price-focused accuracy fields
      price_accuracy: data.priceAccuracy,
      time_position: data.timePosition,
      price_error: data.priceError,
      time_error: data.timeError,
    };

    try {
      const response = await fetch('/api/game/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (response.ok) {
        setLastMatchLogTime(Date.now());
        setMatchLogCount(prev => prev + 1);
        triggerRoundHistoryRefresh();
      }
    } catch (error) {
      console.error('Error logging match:', error);
    }
  }, [currentRoundId, session?.user?.id, triggerRoundHistoryRefresh]);

  // Start timer when flashcard changes (but NOT when moving via handleNextCard - that manages its own timer)
  // Only auto-start if there's no feedback (no selection made yet) and timer is not already running
  useEffect(() => {
    if (currentFlashcard && !gameState.feedback && !loading && !gameState.showTimeUpOverlay && !timer.isRunning) {
      // Reset timer to the current duration and start it
      timer.reset(timerDuration);
      // Small delay to ensure reset completes before starting
      setTimeout(() => {
        timer.start();
      }, 50);
    }
  }, [currentFlashcard, gameState.feedback, gameState.showTimeUpOverlay, loading, timer, timerDuration]);
  
  // Auto-advance 8 seconds after a selection is made
  useEffect(() => {
    // Only trigger if feedback is set (user made a selection)
    if (gameState.feedback && gameState.score !== null && gameState.score !== undefined) {
      const autoAdvanceTimer = setTimeout(() => {
        if (handleNextCardRef.current) {
          handleNextCardRef.current();
        }
      }, 8000); // 8 seconds after selection
      
      return () => {
        clearTimeout(autoAdvanceTimer);
      };
    }
  }, [gameState.feedback, gameState.score]);

  // Always decide overlay visibility in a hook before any conditional returns
  useEffect(() => {
    if (!currentRoundId && selectedFolder && !isLoadingRounds) {
      setShowRoundSelector(true);
    }
  }, [currentRoundId, selectedFolder, isLoadingRounds]);

  // Extract stock name for DateFolderBrowser
  const currentStock = useMemo(() => 
    extractStockName(currentFlashcard),
    [currentFlashcard]
  );

  // Ensure currentIndex stays within bounds when flashcards array changes
  useEffect(() => {
    if (flashcards.length > 0 && gameState.currentIndex >= flashcards.length) {
      gameState.setCurrentIndex(flashcards.length - 1);
    } else if (flashcards.length > 0 && gameState.currentIndex < 0) {
      gameState.setCurrentIndex(0);
    }
  }, [flashcards.length, gameState]);

  // Load rounds when folder is selected, but only if folder/userId actually changed
  useEffect(() => {
    if (
      selectedFolder &&
      session?.user?.id &&
      !isLoadingRounds &&
      (lastLoadedRef.current.folder !== selectedFolder || lastLoadedRef.current.userId !== session.user.id)
    ) {
      loadRecentRounds(selectedFolder);
      lastLoadedRef.current = { folder: selectedFolder, userId: session.user.id };
    }
  }, [selectedFolder, session?.user?.id, loadRecentRounds, isLoadingRounds]);

  // Handle after effect completion - show after data but don't auto-advance
  // Auto-advance is now handled by score overlay after user selection
  const handleAfterEffectComplete = useCallback(() => {
    // After effect complete - just mark it as done
    // User will see their selection result and score overlay will handle next card
  }, []);

  // Show landing page for unauthenticated users
  if (status !== "authenticated" || !session) {
    return (
      <>
        <LandingPage onSignIn={() => setShowAuthModal(true)} />
        {showAuthModal && (
          <AuthModal 
            open={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        )}
      </>
    );
  }

  // Show data loading state - keep showing if loading OR if we have a folder selected but no data ready yet
  // Check that we have actual usable data: flashcards exist, current flashcard exists, and it has data files with actual data
  // Also verify the data is actually an array/object with content, not just an empty object
  const hasValidData = flashcards.length > 0 && 
                       currentFlashcard && 
                       currentFlashcard.jsonFiles && 
                       currentFlashcard.jsonFiles.length > 0 &&
                       processedData.orderedFiles.length > 0 && 
                       processedData.orderedFiles[0]?.data &&
                       Array.isArray(processedData.orderedFiles[0].data) &&
                       processedData.orderedFiles[0].data.length > 0;
  
  // Show loading screen if:
  // 1. Actively loading, OR
  // 2. We have a folder selected but no valid data ready yet, OR
  // 3. We're initializing (no folder selected yet - this includes when folders are being fetched)
  // This ensures seamless transition from study page loading screen with no gaps
  const hasNoDataReady = selectedFolder && !hasValidData;
  const isInitializing = !selectedFolder && !error; // Initializing if no folder selected and no error yet
  
  // Always show loading screen if we're loading OR if data isn't ready OR if we're initializing
  if (loading || hasNoDataReady || isInitializing) {
    return (
      <>
        {/* Black background overlay covering entire page including header/footer */}
        <div className="fixed inset-0 bg-black z-40" />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden">
          <LoadingStates.DataLoading
            progress={loadingProgress}
            step={loadingStep || (hasNoDataReady ? "Preparing data..." : isInitializing ? "Initializing..." : "")}
            folder={selectedFolder}
          />
        </div>
      </>
    );
  }

  // Show error state
  if (error) {
    return (
      <LoadingStates.ErrorState
        error={error}
        onRetry={() => {
          clearError();
          setSelectedFolder(null);
        }}
      />
    );
  }

  // Show error state if there's an error and no data
  if (
    (!flashcards.length ||
    !currentFlashcard ||
    processedData.orderedFiles.length === 0) &&
    error
  ) {
    return (
      <LoadingStates.ErrorState
        error={error}
        onRetry={() => {
          clearError();
          setSelectedFolder(null);
        }}
      />
    );
  }
  
  // If no data but no error, continue to render the main interface (will show folder selector)
  
  // Show round selection prompt when no round is selected

  // Main game interface
  return (
    <div style={{ marginTop: UI_CONFIG.CONTAINER_MARGIN_TOP }}>
      <div className="min-h-screen w-full flex justify-center items-center p-2 sm:p-4 md:p-6">
        <div className="w-full max-w-[1000px] bg-black rounded-2xl sm:rounded-3xl overflow-hidden border border-white shadow-2xl transition-all duration-300">
          
          {/* Chart Section */}
          <TypedChartSection
            orderedFiles={processedData.orderedFiles}
            afterData={processedData.afterJsonData}
            timer={timer.displayValue}
            pointsTextArray={processedData.pointsTextArray}
            feedback={gameState.feedback}
            disabled={gameState.disableButtons}
            isTimeUp={gameState.showTimeUpOverlay}
            onAfterEffectComplete={handleAfterEffectComplete}
            // Coordinate-based selection props
            onChartClick={handleChartClick}
            userSelection={gameState.userSelection}
            targetPoint={targetPoint}
            distance={gameState.distance}
            score={gameState.score}
            onNextCard={handleNextCard}
          />


          {/* Folder Section */}
          <TypedFolderSection
            selectedFolder={selectedFolder}
            folderOptions={folders}
            onFolderChange={handleFolderChange}
            accuracy={gameState.metrics.accuracy}
            onNewRound={handleNewRound}
            onRoundHistory={() => setShowRoundHistory(true)}
            timerDuration={timerDuration}
            onTimerDurationChange={handleTimerDurationChange}
            isCreatingRound={isCreatingRound}
          />
          
          {/* Date Folder Browser Section */}
          <div className="mt-8 sm:mt-1 mb-20">
            <DateFolderBrowser 
              session={session} 
              currentStock={currentStock}
              isTimeUp={gameState.showTimeUpOverlay}
              flashcards={flashcards as FlashcardData[]}
              currentFlashcard={currentFlashcard}
            />
          </div>

          {/* Time's Up Overlay */}
          {gameState.showTimeUpOverlay && (
            <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4">
              <div className="pointer-events-auto bg-black bg-opacity-90 border-2 border-turquoise-500 shadow-xl rounded-lg px-6 sm:px-8 py-3 sm:py-4 animate-pulse-slow max-w-[90%] sm:max-w-md mx-auto">
                <div className="text-center">
                  <h2 className="text-2xl sm:text-2xl font-bold mb-1 text-turquoise-500 animate-glow">
                    Time's Up!
                  </h2>
                  <p className="text-white opacity-90 text-base sm:text-lg">
                    Please make your selection
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Round History Modal */}
          {showRoundHistory && (
            <RoundHistory
              isOpen={showRoundHistory}
              onClose={() => {
                console.log('=== CLOSING ROUND HISTORY MODAL ===');
                // Capture the refresh function in a variable before state update
                const refreshFn = roundHistoryRefresh;
                setShowRoundHistory(false);
                // Refresh round history data when closing to ensure stats are up to date
                if (refreshFn && typeof refreshFn === 'function') {
                  console.log('Refreshing round history data when closing modal');
                  // Add a small delay before refreshing to ensure any pending updates are complete
                  setTimeout(() => {
                    console.log('Executing refresh after modal close');
                    // Double-check the function is still valid before calling
                    if (refreshFn && typeof refreshFn === 'function') {
                      refreshFn();
                    } else {
                      console.warn('Refresh function is no longer valid');
                    }
                  }, 500);
                } else {
                  console.log('No refresh function available to call');
                }
              }}
              onLoadRound={(roundId: string, datasetName: string) => {
                console.log("Loading round:", roundId, datasetName);
                handleSelectRound(roundId);
                setShowRoundHistory(false);
              }}
              userId={session?.user?.id}
              onRefresh={setRoundHistoryRefresh}
            />
          )}
        </div>
      </div>

      {/* Global Styles for Animations */}
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
      {/* Round Selector Modal (rendered over the main interface) */}
      {showRoundSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-none">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 pointer-events-auto border-2 border-turquoise-400">
            <h3 className="text-xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-turquoise-600 to-turquoise-500 bg-clip-text text-transparent">
              Choose Round
            </h3>
            {isLoadingRounds ? (
              <div className="flex items-center justify-center w-full py-8">
                <div className="flex flex-col justify-center items-center space-y-6 p-8 bg-black rounded-xl shadow-2xl max-w-md w-full border border-white">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-r-2 border-b-2 border-turquoise-400 border-t-transparent"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-turquoise-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="text-center space-y-3">
                    <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-turquoise-400 to-turquoise-300 bg-clip-text text-transparent">
                      Loading Rounds
                    </h2>
                    <p className="text-turquoise-300 text-lg font-medium">Loading rounds...</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {availableRounds.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">Recent Rounds:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableRounds.map((round: any) => (
                        <div
                          key={round.id}
                          className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg hover:bg-turquoise-50 hover:border-turquoise-400 cursor-pointer transition-all"
                          onClick={() => handleSelectRound(round.id)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              <span className={round.completed ? 'text-turquoise-600' : 'text-turquoise-500'}>{round.completed ? '✓' : '◯'}</span> Round from {new Date(round.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {round.completed ? (
                                <span className="text-turquoise-600 font-medium">Completed</span>
                              ) : (
                                <span className="text-turquoise-500 font-medium">In Progress</span>
                              )} • <span className="text-gray-700">{round.dataset_name}</span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex space-x-3">
                  <button
                    onClick={handleNewRound}
                    disabled={isCreatingRound}
                    className="flex-1 bg-gradient-to-r from-turquoise-600 to-turquoise-500 text-white px-4 py-2 rounded-lg hover:from-turquoise-700 hover:to-turquoise-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all shadow-lg shadow-turquoise-500/50"
                  >
                    {isCreatingRound ? 'Creating...' : 'Start New Round'}
                  </button>
                  <button
                    onClick={() => setShowRoundSelector(false)}
                    className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 