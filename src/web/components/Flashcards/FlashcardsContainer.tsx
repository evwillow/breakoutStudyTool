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
  ActionButtonsRow, 
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
import { processFlashcardData, extractStockName } from "./utils/dataProcessors";
import { GAME_CONFIG, UI_CONFIG, TIMER_CONFIG } from "./constants";

// Type the imported JS components
const TypedChartSection = ChartSection as React.ComponentType<any>;
const TypedActionButtonsRow = ActionButtonsRow as React.ComponentType<any>;
const TypedFolderSection = FolderSection as React.ComponentType<any>;

export default function FlashcardsContainer() {
  const { data: session, status } = useSession();
  
  // Data management
  const {
    folders,
    flashcards,
    selectedFolder,
    currentFlashcard,
    loading,
    loadingProgress,
    loadingStep,
    error,
    setSelectedFolder,
    clearError,
  } = useFlashcardData({
    autoSelectFirstFolder: true,
  });

  // Process current flashcard data
  const processedData = useMemo(() => {
    return processFlashcardData(currentFlashcard);
  }, [currentFlashcard]);

  // UI state
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

  // Create a more reliable refresh function
  const triggerRoundHistoryRefresh = useCallback(() => {
    const currentRefreshCount = refreshCount + 1;
    setRefreshCount(currentRefreshCount);
    
    console.log('=== TRIGGERING ROUND HISTORY REFRESH ===');
    console.log('Refresh count:', currentRefreshCount);
    console.log('Current time:', Date.now());
    console.log('Last match log time:', lastMatchLogTime);
    console.log('Time since last match:', Date.now() - lastMatchLogTime);
    console.log('Total match logs:', matchLogCount);
    
    // Capture the refresh function to ensure it's available when setTimeout callback runs
    const refreshFn = roundHistoryRefresh;
    
    if (refreshFn && typeof refreshFn === 'function') {
      console.log('Calling round history refresh function');
      // Add a longer delay to ensure database has time to commit
      // Also add a random delay to avoid race conditions
      const delay = 1000 + Math.random() * 500; // 1-1.5 seconds
      console.log('Scheduling refresh with delay:', delay, 'ms');
      
      setTimeout(() => {
        console.log('Executing delayed refresh at time:', Date.now());
        console.log('Executing refresh #', currentRefreshCount);
        // Double-check the function is still valid before calling
        if (refreshFn && typeof refreshFn === 'function') {
          refreshFn();
        } else {
          console.warn('Refresh function is no longer valid in setTimeout callback');
        }
      }, delay);
    } else {
      console.log('No refresh function available');
    }
  }, [roundHistoryRefresh, lastMatchLogTime, matchLogCount, refreshCount]);

  // Game state management
  const gameState = useGameState({
    flashcardsLength: flashcards.length,
    thingData: processedData.thingData,
    onCorrectAnswer: useCallback(() => {
      console.log("Correct answer!");
    }, []),
    onIncorrectAnswer: useCallback(() => {
      console.log("Incorrect answer!");
    }, []),
    onGameComplete: useCallback(async () => {
      console.log("Game completed!");
      
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
            console.log('Round marked as completed:', result.data);
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

  // Timer management
  const timer = useTimer({
    initialDuration: TIMER_CONFIG.INITIAL_DURATION,
    onTimeUp: useCallback(() => {
      gameState.setShowTimeUpOverlay(true);
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
    console.log('Creating new round for:', { userId: session.user.id, selectedFolder });
    
    try {
      const requestData = {
        dataset_name: selectedFolder,
        user_id: session.user.id,
        completed: false,
      };

      console.log('Sending round creation request:', requestData);

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

      console.log('Created new round successfully:', result.data);
      console.log('New round ID:', result.data?.id);
      
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
    console.log('=== LOADING RECENT ROUNDS ===');
    console.log('Dataset name:', datasetName);
    console.log('User ID:', session?.user?.id);
    
    if (!session?.user?.id || !datasetName) {
      console.log('Cannot load rounds: missing user ID or dataset name');
      return;
    }

    setIsLoadingRounds(true);
    try {
      const url = `/api/game/rounds?userId=${session.user.id}&datasetName=${encodeURIComponent(datasetName)}&limit=5`;
      console.log('Fetching rounds from:', url);
      
      const response = await fetch(url);
      const result = await response.json();

      console.log('Rounds API response status:', response.status);
      console.log('Rounds API response:', result);

      if (!response.ok) {
        console.error('Failed to load rounds:', result.error);
        setAvailableRounds([]);
        return;
      }

      const rounds = result.data || [];
      console.log('Loaded rounds:', rounds);
      console.log('Number of rounds:', rounds.length);
      
      setAvailableRounds(rounds);
      
      // Auto-load the most recent incomplete round
      const mostRecentIncomplete = rounds.find((round: any) => !round.completed);
      console.log('Most recent incomplete round:', mostRecentIncomplete);
      
      if (mostRecentIncomplete) {
        console.log('Auto-loading most recent incomplete round:', mostRecentIncomplete.id);
        setCurrentRoundId(mostRecentIncomplete.id);
      } else if (rounds.length > 0) {
        console.log('All recent rounds are completed. User can start a new round.');
        setShowRoundSelector(true);
      } else {
        console.log('No previous rounds found. Auto-creating new round.');
        // Automatically create a new round when none exist
        const newRoundId = await createNewRound();
        if (newRoundId) {
          console.log('Auto-created new round:', newRoundId);
          setCurrentRoundId(newRoundId);
        } else {
          console.log('Failed to auto-create round, showing selector');
          setShowRoundSelector(true);
        }
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
      setAvailableRounds([]);
      // Try to create a new round even if loading fails
      console.log('Attempting to create new round after error');
      const newRoundId = await createNewRound();
      if (newRoundId) {
        console.log('Auto-created new round after error:', newRoundId);
        setCurrentRoundId(newRoundId);
      } else {
        console.log('Failed to auto-create round after error, showing selector');
        setShowRoundSelector(true);
      }
    } finally {
      setIsLoadingRounds(false);
      console.log('=== END LOADING ROUNDS ===');
    }
  }, [session?.user?.id, createNewRound]);

  // Handle folder change
  const handleFolderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFolder = e.target.value;
    setSelectedFolder(newFolder);
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
    console.log('=== CREATING NEW ROUND ===');
    if (!selectedFolder) {
      console.warn('Cannot create round: no folder selected');
      return;
    }

    console.log('Creating round for folder:', selectedFolder);
    const roundId = await createNewRound();
    console.log('Create round returned:', roundId);
    console.log('Round ID type:', typeof roundId);
    
    // Reset game and timer regardless of round creation result
    gameState.resetGame();
    timer.reset(timerDuration);
    
    if (roundId) {
      console.log('Setting current round ID to:', roundId);
      setCurrentRoundId(roundId);
      setShowRoundSelector(false);
      console.log('New round setup complete');
    } else {
      console.error('Failed to create round - no round ID returned');
      // Still allow the game to start even if round creation fails
      setShowRoundSelector(false);
    }
    console.log('=== END NEW ROUND CREATION ===');
  }, [selectedFolder, createNewRound, gameState, timer, timerDuration]);

  // Handle selecting an existing round
  const handleSelectRound = useCallback((roundId: string) => {
    console.log('=== SELECTING EXISTING ROUND ===');
    console.log('Round ID:', roundId);
    console.log('Round ID type:', typeof roundId);
    console.log('Round ID length:', roundId?.length);
    
    setCurrentRoundId(roundId);
    setShowRoundSelector(false);
    // Reset game and timer for the selected round
    gameState.resetGame();
    timer.reset(timerDuration);
    
    console.log('Round selected and game reset');
    console.log('=== END ROUND SELECTION ===');
  }, [gameState, timer, timerDuration]);

  // Handle next card
  const handleNextCard = useCallback(() => {
    // Reset game state first
    gameState.nextCard();
    // Reset and start timer for the new card
    timer.reset(timerDuration);
    // Small delay to ensure reset completes before starting
    setTimeout(() => {
      timer.start();
    }, 50);
  }, [gameState, timer, timerDuration]);

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

  // Calculate target point from afterData (peak close price)
  const targetPoint = useMemo(() => {
    if (!processedData.afterJsonData || !Array.isArray(processedData.afterJsonData) || processedData.afterJsonData.length === 0) {
      return null;
    }
    
    // Find peak close price
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
    
    if (maxIndex === -1) return null;
    
    // Calculate approximate time index (main data length + index in after data)
    const mainDataLength = processedData.orderedFiles[0]?.data?.length || 0;
    const timeIndex = mainDataLength + maxIndex;
    
    return {
      x: timeIndex,
      y: maxPrice,
      chartX: 0, // Will be calculated in chart component
      chartY: 0, // Will be calculated in chart component
    };
  }, [processedData.afterJsonData, processedData.orderedFiles]);

  // Calculate max distance for scoring (diagonal of chart)
  const maxDistance = useMemo(() => {
    // Approximate max distance as diagonal
    // This will be refined based on actual chart dimensions
    return Math.sqrt(Math.pow(100, 2) + Math.pow(100, 2)); // Rough estimate
  }, []);

  // Handle chart coordinate selection
  const handleChartClick = useCallback((coordinates: { x: number; y: number; chartX: number; chartY: number }) => {
    if (!targetPoint || !maxDistance) return;
    
    gameState.handleCoordinateSelection(
      coordinates,
      (distance: number, score: number) => {
        // Log match with coordinates
        const stockSymbol = extractStockName(currentFlashcard) || 'UNKNOWN';
        const isCorrect = score >= 70;
        
        logMatchWithCoordinates({
          coordinates,
          targetPoint,
          distance,
          score,
          stockSymbol,
          isCorrect,
        });
      },
      targetPoint,
      maxDistance
    );
    timer.pause();
  }, [gameState, timer, targetPoint, maxDistance, currentFlashcard]);

  // Log match with coordinates
  const logMatchWithCoordinates = useCallback(async (data: {
    coordinates: { x: number; y: number };
    targetPoint: { x: number; y: number };
    distance: number;
    score: number;
    stockSymbol: string;
    isCorrect: boolean;
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

  // Start timer when flashcard changes or when moving to a new card
  useEffect(() => {
    if (currentFlashcard && !gameState.feedback && !loading && !gameState.showTimeUpOverlay) {
      // Reset timer to the current duration and start it
      timer.reset(timerDuration);
      // Small delay to ensure reset completes before starting
      setTimeout(() => {
        timer.start();
      }, 50);
    }
  }, [currentFlashcard, gameState.feedback, gameState.showTimeUpOverlay, loading, timer, timerDuration]);

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

  // Load rounds when folder is selected, but only if folder/userId actually changed
  useEffect(() => {
    if (
      selectedFolder &&
      session?.user?.id &&
      !isLoadingRounds &&
      (lastLoadedRef.current.folder !== selectedFolder || lastLoadedRef.current.userId !== session.user.id)
    ) {
      console.log('Loading rounds for folder:', selectedFolder);
      loadRecentRounds(selectedFolder);
      lastLoadedRef.current = { folder: selectedFolder, userId: session.user.id };
    }
  }, [selectedFolder, session?.user?.id, loadRecentRounds, isLoadingRounds]);

  // Debug: Track currentRoundId changes
  useEffect(() => {
    console.log('=== CURRENT ROUND ID CHANGED ===');
    console.log('New currentRoundId:', currentRoundId);
    console.log('Type:', typeof currentRoundId);
    console.log('Is valid UUID:', currentRoundId ? /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(currentRoundId) : false);
    console.log('=== END ROUND ID DEBUG ===');
  }, [currentRoundId]);

  // Handle after effect completion - advance to next card
  const handleAfterEffectComplete = useCallback(async () => {
    console.log("After effect completed, advancing to next card...");
    
    // Small delay to ensure UI has updated properly
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Advance to next card (nextCard() will clear the after chart data automatically)
    console.log("Advancing to next flashcard after after effect completion");
    handleNextCard();
  }, [handleNextCard]);

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

  // Show data loading state
  if (loading) {
    return (
      <LoadingStates.DataLoading
        progress={loadingProgress}
        step={loadingStep}
        folder={selectedFolder}
      />
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

  // Show no data state
  if (
    !flashcards.length ||
    !currentFlashcard ||
    processedData.orderedFiles.length === 0
  ) {
    // Show error if there's an error, otherwise show no data state
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
    
    return (
      <LoadingStates.NoDataState
        onSelectDataset={() => {
          setSelectedFolder(null);
        }}
        debugInfo={{
          flashcardsLength: flashcards.length,
          hasCurrentFlashcard: !!currentFlashcard,
          orderedFilesLength: processedData.orderedFiles.length,
          selectedFolder,
          loading,
          error
        }}
      />
    );
  }

  // Show round selection prompt when no round is selected

  // Main game interface
  return (
    <div style={{ marginTop: UI_CONFIG.CONTAINER_MARGIN_TOP }}>
      <div className="min-h-screen w-full flex justify-center items-center p-2 sm:p-6">
        <div className="w-full max-w-[1000px] bg-black rounded-3xl overflow-hidden border border-white shadow-2xl">
          
          {/* Chart Section */}
          <TypedChartSection
            orderedFiles={processedData.orderedFiles}
            afterData={processedData.afterJsonData}
            timer={timer.displayValue}
            pointsTextArray={processedData.pointsTextArray}
            actionButtons={GAME_CONFIG.ACTION_BUTTONS}
            selectedButtonIndex={gameState.selectedButtonIndex}
            feedback={gameState.feedback}
            onButtonClick={handleSelection}
            disabled={gameState.disableButtons}
            isTimeUp={gameState.showTimeUpOverlay}
            onAfterEffectComplete={handleAfterEffectComplete}
            // New coordinate-based props
            onChartClick={handleChartClick}
            userSelection={gameState.userSelection}
            distance={gameState.distance}
            score={gameState.score}
          />

          {/* Action Buttons Row */}
          <div className="pb-2 sm:pb-8 relative">
            <TypedActionButtonsRow
              actionButtons={GAME_CONFIG.ACTION_BUTTONS}
              selectedButtonIndex={gameState.selectedButtonIndex}
              correctAnswerButton={gameState.correctAnswerButton}
              feedback={gameState.feedback}
              onButtonClick={handleSelection}
              disabled={gameState.showTimeUpOverlay ? false : gameState.disableButtons}
              isTimeUp={gameState.showTimeUpOverlay}
            />
          </div>

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
          <div className="mt-8 pt-6 mb-20">
            <DateFolderBrowser 
              session={session} 
              currentStock={currentStock}
              isTimeUp={gameState.showTimeUpOverlay}
            />
          </div>

          {/* Time's Up Overlay */}
          {gameState.showTimeUpOverlay && (
            <div className="fixed inset-x-0 top-[80px] sm:top-[120px] flex justify-center z-50 pointer-events-none px-4">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent pointer-events-none">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 pointer-events-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Choose Round</h3>
            {isLoadingRounds ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-turquoise-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading rounds...</p>
              </div>
            ) : (
              <>
                {availableRounds.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Recent Rounds:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {availableRounds.map((round: any) => (
                        <div
                          key={round.id}
                          className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleSelectRound(round.id)}
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {round.completed ? '✓' : '◯'} Round from {new Date(round.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {round.completed ? 'Completed' : 'In Progress'} • {round.dataset_name}
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
                    className="flex-1 bg-turquoise-600 text-white px-4 py-2 rounded hover:bg-turquoise-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingRound ? 'Creating...' : 'Start New Round'}
                  </button>
                  <button
                    onClick={() => setShowRoundSelector(false)}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
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