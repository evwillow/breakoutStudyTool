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
    onGameComplete: useCallback(() => {
      console.log("Game completed!");
    }, []),
  });

  // Timer management
  const timer = useTimer({
    initialDuration: TIMER_CONFIG.INITIAL_DURATION,
    onTimeUp: useCallback(() => {
      gameState.setShowTimeUpOverlay(true);
    }, [gameState]),
    autoStart: false,
  });

  // UI state
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showRoundHistory, setShowRoundHistory] = React.useState(false);
  const [timerDuration, setTimerDuration] = React.useState(TIMER_CONFIG.INITIAL_DURATION);

  // Handle folder change
  const handleFolderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFolder = e.target.value;
    setSelectedFolder(newFolder);
    gameState.resetGame();
    timer.reset();
  }, [setSelectedFolder, gameState, timer]);

  // Handle timer duration change
  const handleTimerDurationChange = useCallback((duration: number) => {
    setTimerDuration(duration);
    timer.setDuration(duration);
  }, [timer]);

  // Handle selection with timer integration
  const handleSelection = useCallback((buttonIndex: number) => {
    gameState.handleSelection(buttonIndex);
    timer.pause();
    
    // Show after chart data if available
    if (processedData.afterJsonData) {
      gameState.setAfterChartData(processedData.afterJsonData);
    }
  }, [gameState, timer, processedData.afterJsonData]);

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

  // Main game interface
  return (
    <div style={{ marginTop: UI_CONFIG.CONTAINER_MARGIN_TOP }}>
      <div className="min-h-screen w-full flex justify-center items-center p-4 sm:p-8" 
           style={{ background: 'var(--background)' }}>
        <div className="w-full max-w-7xl bg-black rounded-3xl shadow-2xl overflow-hidden border border-white">
          
          {/* Chart Section */}
          <ChartSection
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
          />

          {/* Action Buttons Row */}
          <div className="pb-2 sm:pb-8 relative">
            <ActionButtonsRow
              actionButtons={GAME_CONFIG.ACTION_BUTTONS}
              selectedButtonIndex={gameState.selectedButtonIndex}
              feedback={gameState.feedback}
              onButtonClick={handleSelection}
              disabled={gameState.showTimeUpOverlay ? false : gameState.disableButtons}
              isTimeUp={gameState.showTimeUpOverlay}
            />
          </div>

          {/* Folder Section */}
          <FolderSection
            selectedFolder={selectedFolder}
            folderOptions={folders}
            onFolderChange={handleFolderChange}
            accuracy={gameState.metrics.accuracy}
            onNewRound={() => {
              gameState.resetGame();
              timer.reset(timerDuration);
            }}
            onRoundHistory={() => setShowRoundHistory(true)}
            timerDuration={timerDuration}
            onTimerDurationChange={handleTimerDurationChange}
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