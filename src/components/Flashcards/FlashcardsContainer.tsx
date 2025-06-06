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
  const processedData = useMemo(() => 
    processFlashcardData(currentFlashcard),
    [currentFlashcard]
  );

  // UI state
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showRoundHistory, setShowRoundHistory] = React.useState(false);
  const [timerDuration, setTimerDuration] = React.useState<number>(TIMER_CONFIG.INITIAL_DURATION);
  const [currentRoundId, setCurrentRoundId] = React.useState<string | null>(null);
  const [isCreatingRound, setIsCreatingRound] = React.useState(false);
  const [isLoadingRounds, setIsLoadingRounds] = React.useState(false);
  const [availableRounds, setAvailableRounds] = React.useState<any[]>([]);
  const [showRoundSelector, setShowRoundSelector] = React.useState(false);

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

          if (response.ok) {
            console.log('Round marked as completed');
          } else {
            console.error('Failed to mark round as completed');
          }
        } catch (error) {
          console.error('Error updating round completion:', error);
        }
      }
    }, [currentRoundId]),
  });

  // Timer management
  const timer = useTimer({
    initialDuration: TIMER_CONFIG.INITIAL_DURATION,
    onTimeUp: useCallback(() => {
      gameState.setShowTimeUpOverlay(true);
    }, [gameState]),
    autoStart: false,
  });

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
        console.log('No previous rounds found. User can start a new round.');
        setShowRoundSelector(true);
      }
    } catch (error) {
      console.error('Error loading rounds:', error);
      setAvailableRounds([]);
      setShowRoundSelector(true);
    } finally {
      setIsLoadingRounds(false);
      console.log('=== END LOADING ROUNDS ===');
    }
  }, [session?.user?.id]);

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

      const result = await response.json();

      if (!response.ok) {
        console.error('Round creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          fullResponse: result
        });
        throw new Error(result.error?.message || 'Failed to create round');
      }

      console.log('Created new round successfully:', result.data);
      console.log('New round ID:', result.data.id);
      
      // Reload rounds to update the available rounds list
      await loadRecentRounds(selectedFolder);
      
      return result.data.id;
    } catch (error) {
      console.error('Error creating round:', {
        error: error instanceof Error ? error.message : String(error),
        userId: session.user.id,
        selectedFolder
      });
      // Don't block the game from starting, just log the error
      return null;
    } finally {
      setIsCreatingRound(false);
    }
  }, [session?.user?.id, selectedFolder, loadRecentRounds]);

  // Handle folder change
  const handleFolderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFolder = e.target.value;
    setSelectedFolder(newFolder);
    gameState.resetGame();
    timer.reset();
    setCurrentRoundId(null);
    setShowRoundSelector(false);
    
    // Load recent rounds for the new folder
    if (newFolder && session?.user?.id) {
      loadRecentRounds(newFolder);
    }
  }, [setSelectedFolder, gameState, timer, session?.user?.id, loadRecentRounds]);

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
    
    if (roundId) {
      console.log('Setting current round ID to:', roundId);
      setCurrentRoundId(roundId);
      setShowRoundSelector(false);
      gameState.resetGame();
      timer.reset(timerDuration);
      console.log('New round setup complete');
    } else {
      console.error('Failed to create round - no round ID returned');
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
    gameState.resetGame();
    timer.reset(timerDuration);
    
    console.log('Round selected and game reset');
    console.log('=== END ROUND SELECTION ===');
  }, [gameState, timer, timerDuration]);

  // Log match to database
  const logMatch = useCallback(async (buttonIndex: number, isCorrect: boolean) => {
    if (!currentRoundId || !currentFlashcard || !session?.user?.id) {
      console.log("Skipping match logging:", {
        hasRoundId: !!currentRoundId,
        hasFlashcard: !!currentFlashcard,
        hasUserId: !!session?.user?.id
      });
      return; // Don't log if no active round or missing data
    }

    // Validate round ID format (must be a UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(currentRoundId)) {
      console.error("Invalid round ID format:", currentRoundId, "- skipping match logging");
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

    console.log("=== MATCH LOGGING DEBUG ===");
    console.log("Attempting to log match:", matchData);
    console.log("Round ID validation:", {
      roundId: currentRoundId,
      isValidUUID: uuidRegex.test(currentRoundId),
      length: currentRoundId.length,
      type: typeof currentRoundId
    });
    console.log("Stock symbol:", stockSymbol);
    console.log("Button index:", buttonIndex);
    console.log("Is correct:", isCorrect);

    try {
      const response = await fetch('/api/game/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchData),
      });

      console.log("Response status:", response.status);
      console.log("Response status text:", response.statusText);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      let result;
      let responseText = '';
      try {
        responseText = await response.text();
        console.log("Raw response text:", responseText);
        
        // Try to parse as JSON
        result = responseText ? JSON.parse(responseText) : {};
        console.log("Parsed response:", result);
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        console.error('Raw response text was:', responseText);
        console.error('Response status:', response.status, response.statusText);
        console.error('Response headers:', Object.fromEntries(response.headers.entries()));
        return;
      }

      if (!response.ok) {
        console.error('Failed to log match:', {
          status: response.status,
          statusText: response.statusText,
          rawResponse: responseText,
          parsedResult: result,
          error: result.error || 'No error details provided',
          fullResponse: result,
          matchData: matchData,
          requestHeaders: {
            'Content-Type': 'application/json',
          }
        });
        // Don't throw error - continue game even if logging fails
      } else {
        console.log('Match logged successfully:', result.data);
      }
    } catch (error) {
      console.error('Error logging match (network/fetch error):', {
        error: error instanceof Error ? error.message : String(error),
        matchData,
        stack: error instanceof Error ? error.stack : undefined
      });
      // Continue game even if logging fails
    }
    console.log("=== END MATCH LOGGING DEBUG ===");
  }, [currentRoundId, currentFlashcard, session?.user?.id]);

  // Handle selection with timer integration and match logging
  const handleSelection = useCallback((buttonIndex: number) => {
    console.log("=== HANDLE SELECTION DEBUG ===");
    console.log("Current round ID:", currentRoundId);
    console.log("Current flashcard:", currentFlashcard ? "exists" : "null");
    console.log("Session user ID:", session?.user?.id);
    console.log("Button index:", buttonIndex);
    
    // Check if answer is correct before calling gameState.handleSelection
    const correctAnswer = processedData.thingData[gameState.metrics.currentMatchIndex];
    const isCorrect = buttonIndex === correctAnswer - 1;

    console.log("Correct answer:", correctAnswer);
    console.log("Is correct:", isCorrect);

    // Log the match asynchronously
    logMatch(buttonIndex, isCorrect);

    gameState.handleSelection(buttonIndex);
    timer.pause();
    
    // Show after chart data if available
    if (processedData.afterJsonData) {
      console.log("After effect starting - showing after chart data", {
        hasAfterData: !!processedData.afterJsonData,
        afterDataLength: Array.isArray(processedData.afterJsonData) ? processedData.afterJsonData.length : 'not array'
      });
      gameState.setAfterChartData(processedData.afterJsonData);
    } else {
      console.log("No after data available for this flashcard");
    }
    console.log("=== END HANDLE SELECTION DEBUG ===");
  }, [gameState, timer, processedData.afterJsonData, processedData.thingData, logMatch, currentRoundId, currentFlashcard, session?.user?.id]);

  // Handle next card
  const handleNextCard = useCallback(() => {
    gameState.nextCard();
    timer.reset(timerDuration);
    timer.start();
  }, [gameState, timer, timerDuration]);

  // Start timer when flashcard changes
  useEffect(() => {
    if (currentFlashcard && !gameState.feedback && !loading) {
      timer.reset(timerDuration);
      timer.start();
    }
  }, [currentFlashcard, gameState.feedback, loading, timer, timerDuration]);

  // Pause timer when showing after chart data
  useEffect(() => {
    if (gameState.afterChartData) {
      timer.pause();
    }
  }, [gameState.afterChartData, timer]);

  // Extract stock name for DateFolderBrowser
  const currentStock = useMemo(() => 
    extractStockName(currentFlashcard),
    [currentFlashcard]
  );

  // Load rounds when folder is selected
  useEffect(() => {
    if (selectedFolder && session?.user?.id && !isLoadingRounds) {
      console.log('Loading rounds for folder:', selectedFolder);
      loadRecentRounds(selectedFolder);
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
    
    // Clear the after chart data first
    gameState.setAfterChartData(null);
    
    // Then advance to next card
    console.log("Advancing to next flashcard after after effect completion");
    handleNextCard();
  }, [gameState, handleNextCard]);

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
    return (
      <LoadingStates.NoDataState
        onSelectDataset={() => {
          setSelectedFolder(null);
        }}
      />
    );
  }

  // Show round selection prompt when no round is selected
  if (!currentRoundId && selectedFolder && !isLoadingRounds) {
    return (
      <>
        <div className="min-h-screen w-full flex justify-center items-center p-4" 
             style={{ background: 'var(--background)' }}>
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ready to Practice</h2>
            <p className="text-gray-600 mb-6">
              Please select a round to continue or start a new practice session.
            </p>
            <button
              onClick={() => setShowRoundSelector(true)}
              className="w-full bg-turquoise-600 text-white px-6 py-3 rounded-lg hover:bg-turquoise-700 font-semibold"
            >
              Choose Round
            </button>
          </div>
        </div>

        {/* Round Selector Modal */}
        {showRoundSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
      </>
    );
  }

  // Main game interface
  return (
    <div style={{ marginTop: UI_CONFIG.CONTAINER_MARGIN_TOP }}>
      <div className="min-h-screen w-full flex justify-center items-center p-4 sm:p-8" 
           style={{ background: 'var(--background)' }}>
        <div className="w-full max-w-7xl bg-black rounded-3xl shadow-2xl overflow-hidden border border-white">
          
          {/* Chart Section */}
          <TypedChartSection
            orderedFiles={processedData.orderedFiles}
            afterData={gameState.afterChartData}
            timer={timer.displayValue}
            pointsTextArray={processedData.pointsTextArray}
            actionButtons={GAME_CONFIG.ACTION_BUTTONS}
            selectedButtonIndex={gameState.selectedButtonIndex}
            feedback={gameState.feedback}
            onButtonClick={handleSelection}
            disabled={gameState.disableButtons}
            isTimeUp={gameState.showTimeUpOverlay}
            onAfterEffectComplete={handleAfterEffectComplete}
          />

          {/* Action Buttons Row */}
          <div className="pb-2 sm:pb-8 relative">
            <TypedActionButtonsRow
              actionButtons={GAME_CONFIG.ACTION_BUTTONS}
              selectedButtonIndex={gameState.selectedButtonIndex}
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
              onClose={() => setShowRoundHistory(false)}
              onLoadRound={(roundId: string, datasetName: string) => {
                console.log("Loading round:", roundId, datasetName);
                handleSelectRound(roundId);
                setShowRoundHistory(false);
              }}
              userId={session?.user?.id}
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
    </div>
  );
} 