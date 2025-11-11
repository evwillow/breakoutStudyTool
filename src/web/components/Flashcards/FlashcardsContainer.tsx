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
  const [roundNameInput, setRoundNameInput] = React.useState('');
  const [lastMatchLogTime, setLastMatchLogTime] = React.useState<number>(0);
  const [matchLogCount, setMatchLogCount] = React.useState<number>(0);
  const [refreshCount, setRefreshCount] = React.useState<number>(0);
  
  // Ref to store handleNextCard for timer callback
  const handleNextCardRef = React.useRef<(() => void) | null>(null);
  const timeUpAdvanceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearTimeUpAdvanceTimeout = React.useCallback(() => {
    if (timeUpAdvanceTimeoutRef.current) {
      clearTimeout(timeUpAdvanceTimeoutRef.current);
      timeUpAdvanceTimeoutRef.current = null;
    }
  }, []);
  
  // Ref to store pending round ID and dataset to load after folder switch
  const pendingRoundRef = React.useRef<{ roundId: string; datasetName: string } | null>(null);
  
  // Ref to track pause state from ChartSection (to prevent auto-advance when paused)
  const isChartPausedRef = React.useRef<boolean>(false);
  
  // Ref to prevent double-advance when both countdown and auto-advance timers fire
  const hasAdvancedRef = React.useRef<boolean>(false);

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
  // Prevent index changes during loading to avoid rapid flipping through stocks
  const currentFlashcard = useMemo(() => {
    // Don't update flashcard if we're still loading - prevents rapid flipping on refresh
    // Check if flashcards are loaded but data might not be ready yet
    const flashcardsLoaded = flashcards.length > 0;
    const hasFlashcardData = flashcardsLoaded && flashcards.some(f => 
      f.jsonFiles && f.jsonFiles.length > 0 && f.jsonFiles.every(file => file.data !== null && file.data !== undefined)
    );
    
    if (loading || !flashcardsLoaded || !hasFlashcardData) {
      // Return null during loading to prevent rapid changes
      return null;
    }
    
    const index = gameState.currentIndex;
    // Ensure index is within bounds
    const safeIndex = Math.max(0, Math.min(index, flashcards.length - 1));
    const flashcard = flashcards[safeIndex] || null;
    
    // If index was out of bounds, reset it (but only if not loading)
    if (index !== safeIndex && flashcards.length > 0 && !loading) {
      console.warn(`⚠️ Current index ${index} out of bounds, resetting to ${safeIndex}`);
      gameState.setCurrentIndex(safeIndex);
    }
    
    return flashcard;
  }, [gameState.currentIndex, flashcards, gameState, loading]);

  // Process current flashcard data
  const processedData = useMemo(() => {
    const result = processFlashcardData(currentFlashcard);
    return result;
  }, [currentFlashcard, gameState.currentIndex]);

  const currentFlashcardKey = useMemo(() => {
    if (!currentFlashcard) {
      return `index_${gameState.currentIndex}`;
    }
    const identifier = currentFlashcard.id || currentFlashcard.name || `index_${gameState.currentIndex}`;
    return `${currentFlashcard.folderName || 'default'}::${identifier}`;
  }, [currentFlashcard, gameState.currentIndex]);

  const currentFlashcardReady = useMemo(() => {
    if (!flashcards.length || !currentFlashcard) {
      return false;
    }

    if (!currentFlashcard.jsonFiles || currentFlashcard.jsonFiles.length === 0) {
      return false;
    }

    const filesLoaded = currentFlashcard.jsonFiles.every(file => file.data !== null && file.data !== undefined);
    if (!filesLoaded) {
      return false;
    }

    if (!processedData.orderedFiles.length) {
      return false;
    }

    const orderedFilesLoaded = processedData.orderedFiles.every(file => file.data !== null && file.data !== undefined);
    if (!orderedFilesLoaded) {
      return false;
    }

    const hasPrimaryData = Array.isArray(processedData.orderedFiles[0]?.data) && processedData.orderedFiles[0].data.length > 0;
    if (!hasPrimaryData) {
      return false;
    }

    const afterDataValid = processedData.afterJsonData === null ||
      (Array.isArray(processedData.afterJsonData) && processedData.afterJsonData.length >= 0);

    return afterDataValid;
  }, [flashcards, currentFlashcard, processedData]);

  const [stabilizedFlashcard, setStabilizedFlashcard] = React.useState<FlashcardData | null>(null);
  const [stabilizedData, setStabilizedData] = React.useState<ReturnType<typeof processFlashcardData>>({
    orderedFiles: [],
    afterJsonData: null,
    pointsTextArray: [],
  });
  const stabilizedKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (loading || !currentFlashcardReady || !currentFlashcard) {
      return;
    }

    const nextKey = currentFlashcardKey;
    const nextData = processedData;

    setStabilizedData(prevData => {
      const prevKey = stabilizedKeyRef.current;
      const prevLen = prevData?.orderedFiles?.[0]?.data?.length ?? 0;
      const nextLen = nextData?.orderedFiles?.[0]?.data?.length ?? 0;

      if (prevKey === nextKey) {
        if (nextLen > prevLen) {
          stabilizedKeyRef.current = nextKey;
          setStabilizedFlashcard(currentFlashcard);
          return nextData;
        }
        return prevData;
      }

      stabilizedKeyRef.current = nextKey;
      setStabilizedFlashcard(currentFlashcard);
      return nextData;
    });
  }, [loading, currentFlashcardReady, currentFlashcard, processedData, currentFlashcardKey]);

  const hasStableMatch = stabilizedKeyRef.current === currentFlashcardKey && stabilizedFlashcard;

  const activeFlashcard = currentFlashcardReady
    ? (hasStableMatch ? stabilizedFlashcard : currentFlashcard)
    : (stabilizedFlashcard ?? currentFlashcard);

  const activeProcessedData = currentFlashcardReady
    ? (hasStableMatch ? stabilizedData : processedData)
    : (stabilizedFlashcard ? stabilizedData : processedData);

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

    // Build match data, filtering out undefined/null/NaN values
    const matchData: any = {
      round_id: currentRoundId,
      stock_symbol: data.stockSymbol,
      correct: Boolean(data.isCorrect), // Ensure it's always a boolean
    };
    
    // Add numeric fields only if they are valid numbers
    if (typeof data.coordinates.x === 'number' && !isNaN(data.coordinates.x)) {
      matchData.user_selection_x = data.coordinates.x;
    }
    if (typeof data.coordinates.y === 'number' && !isNaN(data.coordinates.y)) {
      matchData.user_selection_y = data.coordinates.y;
    }
    if (typeof data.targetPoint.x === 'number' && !isNaN(data.targetPoint.x)) {
      matchData.target_x = data.targetPoint.x;
    }
    if (typeof data.targetPoint.y === 'number' && !isNaN(data.targetPoint.y)) {
      matchData.target_y = data.targetPoint.y;
    }
    if (typeof data.distance === 'number' && !isNaN(data.distance)) {
      matchData.distance = data.distance;
    }
    if (typeof data.score === 'number' && !isNaN(data.score)) {
      matchData.score = data.score;
    }
    
    // Add optional fields only if they are defined and not NaN
    if (data.priceAccuracy !== undefined && !isNaN(data.priceAccuracy)) {
      matchData.price_accuracy = data.priceAccuracy;
    }
    if (data.timePosition !== undefined && !isNaN(data.timePosition)) {
      matchData.time_position = data.timePosition;
    }
    if (data.priceError !== undefined && !isNaN(data.priceError)) {
      matchData.price_error = data.priceError;
    }
    if (data.timeError !== undefined && !isNaN(data.timeError)) {
      matchData.time_error = data.timeError;
    }

    try {
      console.log('[MATCHES CLIENT] Sending match data:', matchData);
      const response = await fetch('/api/game/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchData),
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorData = {};
        let responseText = '';
        try {
          responseText = await response.text();
          if (responseText) {
            try {
              errorData = JSON.parse(responseText);
            } catch {
              // If not JSON, use the text as error message
              errorData = { message: responseText };
            }
          }
        } catch (textError) {
          console.error('[MATCHES CLIENT] Failed to read response text:', textError);
        }
        
        // Only log error if there's meaningful error data
        if (Object.keys(errorData).length > 0 || responseText) {
          console.error('[MATCHES CLIENT] Failed to log match:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            responseText: responseText || 'No response text',
            matchData: matchData // Log the data we tried to send for debugging
          });
        } else {
          // Silent fail for empty errors to reduce console noise
          console.warn('[MATCHES CLIENT] Match logging failed with status:', response.status);
        }
      } else {
        setLastMatchLogTime(Date.now());
        setMatchLogCount(prev => prev + 1);
        triggerRoundHistoryRefresh();
      }
    } catch (error) {
      console.error('[MATCHES CLIENT] Error logging match:', error);
    }
  }, [currentRoundId, session?.user?.id, triggerRoundHistoryRefresh]);

  // Timer management - normal timer behavior, force selection on time up
  // Note: forceSelection will be defined after targetPoint, priceRange, and timeRange
  const forceSelectionRef = React.useRef<(() => void) | null>(null);
  const timerRef = React.useRef<{ reset: (duration: number) => void; start: () => void; pause?: () => void } | null>(null);
  
  // Ref to access gameState in timer callback
  const gameStateRef = React.useRef(gameState);
  React.useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  React.useEffect(() => {
    if (gameState.score !== null && gameState.score !== undefined) {
      clearTimeUpAdvanceTimeout();
    }
  }, [gameState.score, clearTimeUpAdvanceTimeout]);
  
  const timer = useTimer({
    initialDuration: TIMER_CONFIG.INITIAL_DURATION,
    onTimeUp: useCallback(() => {
      const currentGameState = gameStateRef.current;

      if (currentGameState.score === null || currentGameState.score === undefined) {
        // Show time-up overlay when timer runs out
        // The overlay will auto-dismiss after 5 seconds and advance to next stock
        currentGameState.setShowTimeUpOverlay(true);
        clearTimeUpAdvanceTimeout();

        timerRef.current?.pause?.();
        if (timerDuration > 0 && timerRef.current?.reset) {
          timerRef.current.reset(timerDuration);
        }

        // Note: Advance to next stock is now handled by handleTooltipDismiss
        // when the tooltip auto-dismisses after 5 seconds
      } else if (handleNextCardRef.current) {
        // If user already made a selection, advance immediately
        handleNextCardRef.current();
      }
    }, [clearTimeUpAdvanceTimeout, timerDuration]),
    autoStart: false,
  });

  // Update timer ref so onTimeUp callback can access timer methods
  React.useEffect(() => {
    timerRef.current = {
      reset: timer.reset,
      start: timer.start,
      pause: timer.pause,
    };
  }, [timer.reset, timer.start, timer.pause]);

  const handleTooltipDismiss = React.useCallback((event?: { reason?: string }) => {
    // Hide the overlay immediately for smooth transition
    gameState.setShowTimeUpOverlay(false);

    if (event?.reason === 'manual-chart') {
      clearTimeUpAdvanceTimeout();
      if (timerDuration > 0) {
        if (timerRef.current?.reset) {
          timerRef.current.reset(timerDuration);
        }
        timerRef.current?.start?.();
      }
      // Don't advance on manual chart selection - user is making a selection
      return;
    }

    // When tooltip is dismissed (auto, click-outside, or any other reason), ALWAYS advance to next stock
    clearTimeUpAdvanceTimeout();
    
    // Use requestAnimationFrame for smoother transitions, then advance after popup animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Always advance to next stock when popup is dismissed (except manual-chart)
        if (handleNextCardRef.current) {
          handleNextCardRef.current();
        } else if (gameState && gameState.nextCard) {
          // Fallback: use gameState directly
          gameState.nextCard();
          // Also reset and start timer if needed
          if (selectedFolder && timerDuration > 0 && timerRef.current) {
            timerRef.current.reset(timerDuration);
            timerRef.current.start();
          }
        }
      });
    });
  }, [gameState, clearTimeUpAdvanceTimeout, timerDuration, selectedFolder]);

  // Track last loaded folder/userId to prevent repeated calls
  const lastLoadedRef = React.useRef<{folder: string|null, userId: string|null}>({folder: null, userId: null});

  // Generate automatic round name
  const generateRoundName = useCallback(() => {
    const date = new Date();
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} ${timeStr}`;
  }, []);

  // Create a new round in the database
  const createNewRound = useCallback(async (name?: string) => {
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
        name: name || undefined,
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
    const cacheKey = `${session.user.id}_${datasetName}`;

    if (!window.__roundCache) {
      window.__roundCache = {};
    }
    const roundCache = window.__roundCache;

    if (roundCache[cacheKey]) {
      const cached = roundCache[cacheKey];
      setAvailableRounds(cached.rounds || []);
      if (cached.rounds && cached.rounds.length > 0) {
        const cachedMostRecent = cached.rounds.find((round: any) => !round.completed) || cached.rounds[0];
        if (cachedMostRecent && !pendingRoundRef.current) {
          setCurrentRoundId(cachedMostRecent.id);
          timer.reset(timerDuration);
          if (timerDuration > 0) {
            requestAnimationFrame(() => timer.start());
          }
        }
      }
    }

    try {
      const url = `/api/game/rounds?userId=${session.user.id}&datasetName=${encodeURIComponent(datasetName)}&limit=5`;
      
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to load rounds:', result.error);
        setAvailableRounds([]);
        // Try to create a new round even if loading fails, so the game can still work
        const autoName = generateRoundName();
        const newRoundId = await createNewRound(autoName);
        if (newRoundId) {
          setCurrentRoundId(newRoundId);
          // Timer will start automatically via useEffect when currentRoundId is set
        }
        return;
      }

      const rounds = result.data || [];
      
      setAvailableRounds(rounds);
      roundCache[cacheKey] = {
        rounds,
        fetchedAt: Date.now(),
      };

      // Skip auto-loading if there's a pending round to load (user selected a specific round)
      if (pendingRoundRef.current) {
        console.log('Skipping auto-load - pending round will be loaded:', pendingRoundRef.current.roundId);
        return;
      }

      // Auto-load the most recent incomplete round
      const mostRecentIncomplete = rounds.find((round: any) => !round.completed);
      
      if (mostRecentIncomplete) {
        const roundId = mostRecentIncomplete.id;
        setCurrentRoundId(roundId);

        if (!window.__matchCache) {
          window.__matchCache = {};
        }

        const matchCacheKey = roundId;
        const matchCache = window.__matchCache;

        if (matchCache[matchCacheKey]?.matches) {
          gameState.initializeFromMatches(matchCache[matchCacheKey].matches);
        } else {
          (async () => {
            try {
              const matchResponse = await fetch(`/api/game/matches?roundId=${roundId}`);
              if (matchResponse.ok) {
                const matchResult = await matchResponse.json();
                const matches = matchResult.data || [];
                if (matches.length > 0) {
                  matchCache[matchCacheKey] = {
                    matches,
                    fetchedAt: Date.now(),
                  };
                  gameState.initializeFromMatches(matches);
                }
              }
            } catch (error) {
              console.error('Error loading matches for auto-loaded round:', error);
            }
          })();
        }

        // Immediately start timer for the active round
        timer.reset(timerDuration);
        if (timerDuration > 0) {
          requestAnimationFrame(() => {
            timer.start();
          });
        }
      } else if (rounds.length > 0) {
        setShowRoundSelector(true);
      } else {
        // Automatically create a new round when none exist
        const autoName = generateRoundName();
        const newRoundId = await createNewRound(autoName);
        if (newRoundId) {
          setCurrentRoundId(newRoundId);
          timer.reset(timerDuration);
          if (timerDuration > 0) {
            requestAnimationFrame(() => {
              timer.start();
            });
          }
        } else {
          // Even if round creation fails, allow game to work (practice mode)
          // Timer will start via the auto-start effect when flashcard loads
          setShowRoundSelector(true);
        }
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
      setAvailableRounds([]);
      // Try to create a new round even if loading fails
      const autoName = generateRoundName();
      const newRoundId = await createNewRound(autoName);
      if (newRoundId) {
        setCurrentRoundId(newRoundId);
        timer.reset(timerDuration);
        if (timerDuration > 0) {
          requestAnimationFrame(() => {
            timer.start();
          });
        }
      } else {
        setShowRoundSelector(true);
      }
    } finally {
      setIsLoadingRounds(false);
    }
  }, [session?.user?.id, createNewRound, gameState, timer, timerDuration, generateRoundName]);

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

    // Show round selector modal so user can optionally name the round
    setRoundNameInput(''); // Clear any previous input
    setShowRoundSelector(true);
  }, [selectedFolder]);

  // Handle confirming round creation from the modal
  const handleConfirmNewRound = useCallback(async () => {
    if (!selectedFolder) {
      return;
    }

    // Generate automatic name and use it if user hasn't provided one
    const name = roundNameInput.trim() || generateRoundName();

    const roundId = await createNewRound(name);
    
    // Reset game and timer regardless of round creation result
    gameState.resetGame();
    timer.reset(timerDuration);
    setRoundNameInput(''); // Clear input after creating
    
    if (roundId) {
      setCurrentRoundId(roundId);
      setShowRoundSelector(false);
      // Timer will start automatically via useEffect when currentRoundId is set
    } else {
      console.error('Failed to create round - no round ID returned');
      // Still allow the game to start even if round creation fails
      setShowRoundSelector(false);
    }
  }, [selectedFolder, roundNameInput, generateRoundName, createNewRound, gameState, timer, timerDuration]);

  // Helper function to load round matches and initialize game state
  const loadRoundMatches = useCallback(async (roundId: string) => {
    setCurrentRoundId(roundId);
    setShowRoundSelector(false);
    pendingRoundRef.current = null; // Clear pending round
    
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
    
    // Timer will start automatically via the useEffect that watches currentRoundId
  }, [gameState, timer, timerDuration]);

  // Handle selecting an existing round
  const handleSelectRound = useCallback(async (roundId: string, datasetName?: string) => {
    // If datasetName is provided and different from current folder, switch folders first
    if (datasetName && datasetName !== selectedFolder) {
      console.log(`Switching folder from ${selectedFolder} to ${datasetName} for round ${roundId}`);
      
      // Reset game state before switching folders
      gameState.resetGame();
      timer.reset(timerDuration);
      setCurrentRoundId(null);
      
      // Store the round ID and dataset name to load after folder is ready
      pendingRoundRef.current = { roundId, datasetName };
      
      // Switch folder - this will trigger flashcard loading
      setSelectedFolder(datasetName);
      
      // The round will be loaded by the effect that watches for flashcards being ready
      return;
    }
    
    // If folder already matches, load the round directly
    await loadRoundMatches(roundId);
  }, [gameState, timer, timerDuration, selectedFolder, setSelectedFolder, loadRoundMatches]);

  // Handle next card with smooth transition
  const handleNextCard = useCallback(() => {
    // Pause timer first to prevent any timer-related state updates
    timer.pause();
    
    // Reset game state - this clears all selection state (including feedback) and moves to next card
    // State is reset first, then index is updated to ensure clean transition
    gameState.nextCard();
    
    // Reset timer to the current duration setting
    timer.reset(timerDuration);
    
    // Start timer for the new card after a delay to ensure state has fully updated
    // This gives React time to process the state updates and re-render with new data
    // Timer should work even without a round (for practice mode)
    // Don't start if timerDuration is 0 (always pause mode)
    // Use requestAnimationFrame for smoother transitions
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (selectedFolder && timerDuration > 0) { // Only start if we have a folder selected (game is active) and duration > 0
          timer.start();
        }
      });
    });
  }, [gameState, timer, timerDuration, selectedFolder]);
  
  // Store handleNextCard in ref for timer callback
  React.useEffect(() => {
    handleNextCardRef.current = handleNextCard;
  }, [handleNextCard]);

  // Log match to database
  const logMatch = useCallback(async (buttonIndex: number, isCorrect: boolean) => {
    if (!currentRoundId || !activeFlashcard || !session?.user?.id) {
      return; // Don't log if no active round or missing data
    }

    // Validate round ID format (must be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentRoundId)) {
      return;
    }

    // Extract stock symbol from current flashcard
    const stockSymbol = extractStockName(activeFlashcard) || 'UNKNOWN';

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
  }, [currentRoundId, activeFlashcard, session?.user?.id, triggerRoundHistoryRefresh]);

  // Handle selection with timer integration and match logging
  const handleSelection = useCallback((buttonIndex: number) => {
    gameState.handleSelection(buttonIndex, (isCorrect: boolean) => {
      logMatch(buttonIndex, isCorrect);
    });
    timer.pause();
  }, [gameState, timer, logMatch]);

  // Calculate target point and ranges from data
  const { targetPoint, priceRange, timeRange } = useMemo(() => {
  if (!activeProcessedData.afterJsonData || !Array.isArray(activeProcessedData.afterJsonData) || activeProcessedData.afterJsonData.length === 0) {
      return { targetPoint: null, priceRange: null, timeRange: null };
    }
    
    const mainData = activeProcessedData.orderedFiles[0]?.data || [];
    const mainDataLength = mainData.length;
    
    // Find peak close price in after data
    let maxClose = -Infinity;
    let maxIndex = -1;
    let maxPrice = 0;
    
    activeProcessedData.afterJsonData.forEach((point: any, index: number) => {
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
    activeProcessedData.afterJsonData.forEach((point: any) => {
      const close = point.close || point.Close || point.CLOSE;
      if (close && typeof close === 'number') allPrices.push(close);
    });
    
    const priceMin = Math.min(...allPrices);
    const priceMax = Math.max(...allPrices);
    const pricePadding = (priceMax - priceMin) * 0.2; // 20% padding for extended selection
    
    // Calculate time range (extend beyond current data to allow future predictions)
    const totalTimePoints = mainDataLength + activeProcessedData.afterJsonData.length;
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
  }, [activeProcessedData.afterJsonData, activeProcessedData.orderedFiles]);

  // Force selection when timer expires - selects at middle of selectable area
  // Must be defined after targetPoint, priceRange, and timeRange
  const forceSelection = useCallback(() => {
    if (!targetPoint || !priceRange || !timeRange || gameState.score !== null) {
      // Already have a selection or no target point available
      return;
    }
    
    const mainDataLength = activeProcessedData.orderedFiles[0]?.data?.length || 0;
    
    // Select at middle of the selectable time range (after last data point)
    // Use middle of price range for Y coordinate
    const selectableTimeMin = mainDataLength;
    const selectableTimeMax = timeRange.max;
    const forcedX = selectableTimeMin + Math.floor((selectableTimeMax - selectableTimeMin) / 2);
    const forcedY = priceRange.min + (priceRange.max - priceRange.min) / 2;
    
    // Create coordinates object
    const forcedCoordinates = {
      x: forcedX,
      y: forcedY,
      chartX: 0, // Will be calculated by chart
      chartY: 0, // Will be calculated by chart
    };
    
    // Directly call gameState.handleCoordinateSelection (same as handleChartClick does)
    gameState.handleCoordinateSelection(
      forcedCoordinates,
      (distance: number, score: number, scoreData?: any) => {
        // Log match with coordinates
        const stockSymbol = extractStockName(activeFlashcard) || 'UNKNOWN';
        const isCorrect = scoreData?.priceAccuracy >= 70 || score >= 70;
        
        logMatchWithCoordinates({
          coordinates: forcedCoordinates,
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
  }, [targetPoint, priceRange, timeRange, gameState, activeProcessedData, activeFlashcard, timer, logMatchWithCoordinates]);

  // Update the ref so timer can access forceSelection
  React.useEffect(() => {
    forceSelectionRef.current = forceSelection;
  }, [forceSelection]);

  // Handle chart coordinate selection
  const handleChartClick = useCallback((coordinates: { x: number; y: number; chartX: number; chartY: number }) => {
    if (!targetPoint || !priceRange || !timeRange) {
      return;
    }
    
    // Verify selection is after the last data point
    const mainDataLength = activeProcessedData.orderedFiles[0]?.data?.length || 0;
    
    if (coordinates.x <= mainDataLength - 1) {
      // Selection is not in the future - don't process
      return;
    }
    
    gameState.handleCoordinateSelection(
      coordinates,
      (distance: number, score: number, scoreData?: any) => {
        // Log match with coordinates
        const stockSymbol = extractStockName(activeFlashcard) || 'UNKNOWN';
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
  }, [gameState, timer, targetPoint, priceRange, timeRange, activeFlashcard, activeProcessedData, logMatchWithCoordinates]);

  // Start timer when a round is selected
  useEffect(() => {
    if (
      currentRoundId && 
      !loading && 
      selectedFolder && 
      timerDuration > 0 &&
      timer.isReady &&
      !timer.isRunning &&
      !gameState.showTimeUpOverlay
    ) {
      // Reset and start timer when round is selected
      timer.reset(timerDuration);
      // Use requestAnimationFrame to ensure state is updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          timer.start();
        });
      });
    }
  }, [currentRoundId, loading, selectedFolder, timerDuration, timer, gameState.showTimeUpOverlay]);

  // Start timer when flashcard changes (new stock displayed)
  // This ensures the timer starts when moving to a new stock
  // Note: handleNextCard manages its own timer, so we only start if timer isn't already running
  useEffect(() => {
    if (
      activeFlashcard && 
      !loading && 
      selectedFolder && 
      timerDuration > 0 &&
      timer.isReady &&
      !timer.isRunning &&
      currentRoundId && // Only auto-start if we have a round selected
      !gameState.feedback &&
      !gameState.showTimeUpOverlay
    ) {
      // Reset timer to the current duration and start it for new stock
      timer.reset(timerDuration);
      // Use requestAnimationFrame to ensure state is updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          timer.start();
        });
      });
    }
  }, [activeFlashcard, loading, selectedFolder, timerDuration, timer, currentRoundId, gameState.feedback, gameState.showTimeUpOverlay]);
  
  // Auto-advance 10 seconds after a selection is made (only if not paused)
  // This works in sync with the countdown timer in ChartScoreOverlay
  useEffect(() => {
    // Only trigger if feedback is set (user made a selection)
    if (gameState.feedback && gameState.score !== null && gameState.score !== undefined) {
      // Reset advance flag when starting new timer
      hasAdvancedRef.current = false;
      
      let autoAdvanceTimer: NodeJS.Timeout | null = null;
      let elapsedTime = 0;
      let startTime = Date.now();
      let pauseStartTime: number | null = null;
      const delayDuration = 10000; // 10 seconds after selection (matches countdown timer)
      
      const checkAndAdvance = () => {
        // Check if paused - if so, track pause time and reschedule check
        if (isChartPausedRef.current) {
          if (pauseStartTime === null) {
            // Just entered pause state - record when we paused
            pauseStartTime = Date.now();
          }
          // Check again after a short delay to see if unpaused
          autoAdvanceTimer = setTimeout(checkAndAdvance, 100);
          return;
        }
        
        // If we were paused, add the pause duration to elapsed time
        if (pauseStartTime !== null) {
          const pauseDuration = Date.now() - pauseStartTime;
          startTime += pauseDuration; // Adjust start time to account for pause
          pauseStartTime = null;
        }
        
        // Calculate elapsed time (excluding paused time)
        elapsedTime = Date.now() - startTime;
        const remainingTime = delayDuration - elapsedTime;
        
        if (remainingTime <= 0) {
          // Time is up, advance to next card (double-check we're not paused and haven't already advanced)
          if (handleNextCardRef.current && !isChartPausedRef.current && !hasAdvancedRef.current) {
            hasAdvancedRef.current = true;
            handleNextCardRef.current();
          }
        } else {
          // Schedule next check
          autoAdvanceTimer = setTimeout(checkAndAdvance, Math.min(100, remainingTime));
        }
      };
      
      // Start checking
      autoAdvanceTimer = setTimeout(checkAndAdvance, 100);
      
      return () => {
        if (autoAdvanceTimer) {
          clearTimeout(autoAdvanceTimer);
        }
      };
    } else {
      // Reset advance flag when feedback is cleared
      hasAdvancedRef.current = false;
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
    extractStockName(activeFlashcard),
    [activeFlashcard]
  );

  // Ensure currentIndex stays within bounds when flashcards array changes
  // But only adjust if not loading to prevent rapid flipping on refresh
  useEffect(() => {
    // Don't adjust index during loading - wait until data is fully loaded
    if (loading) {
      return;
    }
    
    // Check if flashcards have data loaded
    const flashcardsHaveData = flashcards.length > 0 && flashcards.some(f => 
      f.jsonFiles && f.jsonFiles.length > 0 && f.jsonFiles.every(file => file.data !== null && file.data !== undefined)
    );
    
    if (!flashcardsHaveData) {
      return;
    }
    
    if (flashcards.length > 0 && gameState.currentIndex >= flashcards.length) {
      gameState.setCurrentIndex(flashcards.length - 1);
    } else if (flashcards.length > 0 && gameState.currentIndex < 0) {
      gameState.setCurrentIndex(0);
    }
  }, [flashcards.length, gameState, loading]);

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

  // Load pending round after flashcards are ready (when switching folders for a round)
  useEffect(() => {
    const pendingRound = pendingRoundRef.current;
    if (pendingRound && flashcards.length > 0 && !loading && selectedFolder === pendingRound.datasetName) {
      console.log(`Flashcards ready, loading pending round: ${pendingRound.roundId} for dataset: ${pendingRound.datasetName}`);
      loadRoundMatches(pendingRound.roundId);
    }
  }, [flashcards.length, loading, selectedFolder, loadRoundMatches]);

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
  // Ensure ALL required files have their data loaded (not just file references)
  const hasValidData = currentFlashcardReady;
  
  // Show loading screen if:
  // 1. Session is not authenticated yet, OR
  // 2. Actively loading, OR
  // 3. We have a folder selected but no valid data ready yet, OR
  // 4. We're initializing (no folder selected yet - this includes when folders are being fetched)
  // This ensures seamless transition from study page loading screen with no gaps
  // Also prevents any visual glitches by ensuring everything is loaded before rendering
  const sessionNotReady = status !== "authenticated";
  const hasNoDataReady = selectedFolder && !hasValidData;
  const isInitializing = !selectedFolder && !error; // Initializing if no folder selected and no error yet
  
  // Always show loading screen if session isn't ready, we're loading, data isn't ready, or we're initializing
  // This ensures NO partial renders - everything must be ready before showing UI
  // Use smooth transitions for loading state
  if (sessionNotReady || loading || hasNoDataReady || isInitializing) {
    return (
      <>
        {/* Black background overlay covering entire page including header/footer */}
        <div className="fixed inset-0 bg-black z-40 pointer-events-none transition-opacity duration-300 ease-in-out" style={{ pointerEvents: 'none', opacity: 1 }} />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none transition-opacity duration-300 ease-in-out" style={{ pointerEvents: 'none', opacity: 1 }}>
          <LoadingStates.DataLoading />
        </div>
      </>
    );
  }

  // Handle error silently - show loading state instead of error page
  if (error) {
    return (
      <>
        {/* Black background overlay covering entire page including header/footer */}
        <div className="fixed inset-0 bg-black z-40 pointer-events-none transition-opacity duration-300 ease-in-out" style={{ pointerEvents: 'none', opacity: 1 }} />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none transition-opacity duration-300 ease-in-out" style={{ pointerEvents: 'none', opacity: 1 }}>
          <LoadingStates.DataLoading />
        </div>
      </>
    );
  }

  // Handle error silently - show loading state instead of error page
  if (
    (!flashcards.length ||
    !activeFlashcard ||
    activeProcessedData.orderedFiles.length === 0) &&
    error
  ) {
    return (
      <>
        {/* Black background overlay covering entire page including header/footer */}
        <div className="fixed inset-0 bg-black z-40 pointer-events-none transition-opacity duration-300 ease-in-out" style={{ pointerEvents: 'none', opacity: 1 }} />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none transition-opacity duration-300 ease-in-out" style={{ pointerEvents: 'none', opacity: 1 }}>
          <LoadingStates.DataLoading />
        </div>
      </>
    );
  }
  
  // If no data but no error, continue to render the main interface (will show folder selector)
  
  // Show round selection prompt when no round is selected

  // Final safety check - ensure we have valid data before rendering
  // This prevents any edge cases where we might have passed the loading check but data isn't actually ready
  // Use smooth transition for loading state
  if (!hasValidData) {
    return (
      <>
        <div className="fixed inset-0 bg-black z-40 pointer-events-none transition-opacity duration-300" style={{ pointerEvents: 'none', opacity: 1 }} />
        <div className="relative w-full h-[calc(100vh-14rem)] flex items-center justify-center p-4 bg-black z-50 overflow-hidden pointer-events-none transition-opacity duration-300" style={{ pointerEvents: 'none', opacity: 1 }}>
          <LoadingStates.DataLoading />
        </div>
      </>
    );
  }

  // Main game interface
  return (
    <div style={{ marginTop: UI_CONFIG.CONTAINER_MARGIN_TOP }}>
      <div className="min-h-screen w-full flex justify-center items-center p-0 sm:p-4 md:p-6">
        <div className="w-full sm:max-w-[1000px] bg-transparent rounded-md sm:rounded-md overflow-hidden border border-transparent transition-all duration-300">
          
          {/* Chart Section and Folder Section - Side by side layout */}
          <div className="flex flex-col lg:flex-row gap-0 items-start">
            {/* Chart Section - Left side */}
            <div className="w-full lg:w-4/5">
              <TypedChartSection
                orderedFiles={activeProcessedData.orderedFiles}
                afterData={activeProcessedData.afterJsonData}
                timer={timer.displayValue}
                pointsTextArray={[]}
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
                timerDuration={timerDuration}
                onTimerDurationChange={handleTimerDurationChange}
                onPauseStateChange={(paused: boolean) => {
                  isChartPausedRef.current = paused;
                }}
                onTimerPause={() => {
                  timer.pause();
                }}
                onDismissTooltip={handleTooltipDismiss}
              />
            </div>

            {/* Folder Section - Right column with Points, Accuracy, and Rounds */}
            <div className="w-full lg:w-1/5">
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
                pointsTextArray={activeProcessedData.pointsTextArray}
                isTimeUp={gameState.showTimeUpOverlay}
              />
            </div>
          </div>
          
          {/* Date Folder Browser Section */}
          <div className="mt-4 lg:mt-2 mb-20">
            <DateFolderBrowser 
              session={session} 
              currentStock={currentStock}
              flashcards={flashcards as FlashcardData[]}
            currentFlashcard={activeFlashcard}
              onChartExpanded={() => {
                // Only restart timer if it's not already running
                // This prevents the timer from restarting when scrolling causes charts to re-enter view
                if (timer.isRunning) {
                  return; // Timer is already running, don't restart it
                }
                // Ensure we have a valid duration
                if (timerDuration <= 0) {
                  return;
                }
                // Reset to the configured duration - this immediately sets state and ref
                timer.reset(timerDuration);
                // Start the timer immediately - reset() sets the state synchronously
                // The start() function will use displayValueRef if timer state hasn't updated yet
                timer.start();
              }}
            />
          </div>


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
                handleSelectRound(roundId, datasetName);
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-none">
          <div className="relative bg-black/95 backdrop-blur-sm rounded-md shadow-xl max-w-md w-full p-6 pointer-events-auto border border-white/30">
            {/* Decorative gradient overlay - faint turquoise */}
            <div className="absolute inset-0 bg-gradient-to-br from-turquoise-500/5 via-transparent to-transparent pointer-events-none rounded-md"></div>
            
            <div className="relative z-10">
              <h3 className="text-xl font-semibold text-white mb-4">
                Choose Round
              </h3>
              {/* Round Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Round Name (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roundNameInput}
                    onChange={(e) => setRoundNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleNewRound();
                      }
                    }}
                    placeholder="Auto-generated if left blank"
                    maxLength={100}
                    className="flex-1 px-3 py-2 bg-black/50 border border-white/30 rounded-md focus:border-turquoise-500 focus:outline-none focus:ring-1 focus:ring-turquoise-500 text-white text-sm placeholder:text-white/50"
                  />
                  <button
                    onClick={() => setRoundNameInput(generateRoundName())}
                    className="px-3 py-2 bg-black/95 backdrop-blur-sm border border-white/30 text-white/90 hover:text-white rounded-md text-sm font-medium transition-colors hover:bg-black/80"
                    title="Generate name"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              <>
                  {availableRounds.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-white/70 mb-3 text-sm uppercase tracking-wide">Recent Rounds:</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {availableRounds.map((round: any) => (
                          <div
                            key={round.id}
                            className="flex items-center justify-between p-3 border border-white/30 rounded-md hover:bg-black/80 hover:border-white/50 cursor-pointer transition-all bg-black/95 backdrop-blur-sm"
                            onClick={() => handleSelectRound(round.id, round.dataset_name)}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white/90">
                                <span className={round.completed ? 'text-turquoise-400' : 'text-white/50'}>{round.completed ? '✓' : '◯'}</span> {round.name || 'Unnamed'} • {new Date(round.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleConfirmNewRound}
                      disabled={isCreatingRound}
                      className="flex-1 bg-turquoise-500/20 hover:bg-turquoise-500/30 text-turquoise-400 hover:text-turquoise-300 px-4 py-2 rounded-md border border-turquoise-500/30 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
                    >
                      {isCreatingRound ? 'Creating...' : 'Start New Round'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRoundSelector(false);
                        setRoundNameInput(''); // Clear input when canceling
                      }}
                      className="px-4 py-2 bg-black/95 backdrop-blur-sm border border-white/30 text-white/90 hover:text-white rounded-md hover:bg-black/80 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  </div>
              </>
            </div>
          </div>
        </div>
      )}

    </div>
  );
} 