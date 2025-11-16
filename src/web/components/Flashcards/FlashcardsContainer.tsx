/**
 * @fileoverview Thin orchestrator for flashcard study workflow.
 * @module src/web/components/Flashcards/FlashcardsContainer.tsx
 * @dependencies React, hooks, components
 */
"use client";

import React, { useMemo, useCallback, useEffect, useRef, useState } from "react";
import { useOptimisticSession } from "@/lib/hooks/useOptimisticSession";

// Helper to check for session cookie synchronously (cached per render)
function checkSessionCookie(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return document.cookie.includes('next-auth.session-token=') || 
           document.cookie.includes('__Secure-next-auth.session-token=');
  } catch {
    return false;
  }
}

// Components
import { DateFolderBrowser, LandingPage, RoundHistory } from "../";
import { AuthModal } from "../Auth";
import dynamic from "next/dynamic";
import ChartView from "./components/ChartView";

const Tutorial = dynamic(() => import("../Tutorial/Tutorial"), {
  ssr: false,
});
import ControlPanel from "./components/ControlPanel";
import RoundSelector from "./components/RoundSelector";
import DataLoadingState from "./components/DataLoadingState";
import PredictionPanel from "./components/PredictionPanel";

// Hooks
import { useFlashcardData } from "./hooks/useFlashcardData";
import { useGameState } from "./hooks/useGameState";
import { useTimer } from "./hooks/useTimer";
import { useRoundManagement } from "./hooks/useRoundManagement";
import { useMatchLogging } from "./hooks/useMatchLogging";
import { useTargetPoint } from "./hooks/useTargetPoint";

// Utils
import { processFlashcardData, extractStockName } from "./utils/dataProcessors";
import type { FlashcardData } from '@breakout-study-tool/shared';
import { UI_CONFIG, TIMER_CONFIG } from "./constants";
import { SCORING_CONFIG } from "@/config/game.config";

interface FlashcardsContainerProps {
  tutorialTrigger?: boolean;
}

export default function FlashcardsContainer({ tutorialTrigger = false }: FlashcardsContainerProps) {
  const { data: session, status, isAuthenticated } = useOptimisticSession();
  const prevTutorialTriggerRef = useRef<boolean>(false);
  const isChartPausedRef = useRef<boolean>(false);
  const handleNextCardRef = useRef<(() => void) | null>(null);

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
    shuffleFlashcards,
  } = useFlashcardData({ autoSelectFirstFolder: true });

  // Timer
  const [timerDuration, setTimerDuration] = React.useState<number>(TIMER_CONFIG.INITIAL_DURATION);

  // Game state
  const gameState = useGameState({
    flashcardsLength: flashcards.length,
    onCorrectAnswer: () => {},
    onIncorrectAnswer: () => {},
    onGameComplete: async () => {},
  });

  // Keep gameState.nextCard in a ref to avoid stale closures
  const gameStateNextCardRef = useRef(gameState.nextCard);
  useEffect(() => {
    gameStateNextCardRef.current = gameState.nextCard;
  }, [gameState.nextCard]);

  // Create timer ref to avoid circular dependency
  const timerRef = useRef<{ pause: () => void; reset: (duration: number) => void } | null>(null);
  
  const timer = useTimer({
    initialDuration: timerDuration,
    onTimeUp: useCallback(() => {
      if (gameState.score === null || gameState.score === undefined) {
        gameState.setShowTimeUpOverlay(true);
        timerRef.current?.pause();
        if (timerDuration > 0) timerRef.current?.reset(timerDuration);
      } else if (handleNextCardRef.current) {
        handleNextCardRef.current();
      }
    }, [gameState, timerDuration]),
    autoStart: false,
  });

  // Update timer ref
  useEffect(() => {
    timerRef.current = {
      pause: timer.pause,
      reset: timer.reset,
    };
  }, [timer.pause, timer.reset]);

  // Round management
  const roundManagement = useRoundManagement(selectedFolder, gameState, timer, timerDuration);

  // Match logging
  const matchLogging = useMatchLogging(roundManagement.currentRoundId);

  // Update game complete handler after round management is available
  useEffect(() => {
    if (roundManagement.currentRoundId && gameState.isGameComplete) {
      const updateRound = async () => {
        try {
          const response = await fetch(`/api/game/rounds/${roundManagement.currentRoundId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: true }),
          });
          
          if (!response.ok) {
            throw new Error(`Failed to update round: ${response.status} ${response.statusText}`);
          }
          
          matchLogging.triggerRoundHistoryRefresh();
        } catch (error) {
          // Silently fail - this is a non-critical operation
          console.warn('Failed to mark round as completed:', error);
        }
      };
      
      updateRound();
    }
  }, [gameState.isGameComplete, roundManagement.currentRoundId, matchLogging]);

  // UI state
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [showRoundHistory, setShowRoundHistory] = React.useState(false);
  const [showTutorial, setShowTutorial] = React.useState(false);

  // Current flashcard processing
  // Don't block on loading - allow flashcard to be selected even if background loading is happening
  const currentFlashcard = useMemo(() => {
    if (flashcards.length === 0) return null;
    const index = gameState.currentIndex;
    const safeIndex = Math.max(0, Math.min(index, flashcards.length - 1));
    const flashcard = flashcards[safeIndex] || null;
    
    // Validate flashcard structure
    if (flashcard && (!flashcard.jsonFiles || !Array.isArray(flashcard.jsonFiles))) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[FlashcardsContainer] Invalid flashcard structure', {
          flashcard,
          hasJsonFiles: !!flashcard.jsonFiles,
          jsonFilesType: typeof flashcard.jsonFiles,
          flashcardKeys: Object.keys(flashcard),
        });
      }
      return null;
    }
    
    return flashcard;
  }, [gameState.currentIndex, flashcards]);

  const processedData = useMemo(() => {
    const result = processFlashcardData(currentFlashcard);
    if (process.env.NODE_ENV === 'development') {
      console.log('[FlashcardsContainer] Processed data', {
        flashcardsLength: flashcards.length,
        hasCurrentFlashcard: !!currentFlashcard,
        currentFlashcardJsonFiles: currentFlashcard?.jsonFiles?.length || 0,
        orderedFilesLength: result.orderedFiles.length,
        hasDFile: result.orderedFiles.some(f => f.fileName?.includes('D.json')),
        dFileDataLength: result.orderedFiles.find(f => f.fileName?.includes('D.json'))?.data && Array.isArray(result.orderedFiles.find(f => f.fileName?.includes('D.json'))?.data)
          ? result.orderedFiles.find(f => f.fileName?.includes('D.json'))!.data.length
          : 'N/A',
        hasAfterData: !!result.afterJsonData,
        afterDataLength: Array.isArray(result.afterJsonData) ? result.afterJsonData.length : 'N/A',
        currentFlashcardStructure: currentFlashcard ? {
          id: currentFlashcard.id,
          name: currentFlashcard.name,
          jsonFilesCount: currentFlashcard.jsonFiles?.length,
          jsonFileNames: currentFlashcard.jsonFiles?.map(f => f.fileName),
        } : null,
      });
    }
    return result;
  }, [currentFlashcard, flashcards.length]);
  const { targetPoint, priceRange, timeRange } = useTargetPoint(processedData);

  const activeFlashcard = currentFlashcard;
  const activeProcessedData = processedData;
  const currentFlashcardReady = useMemo(() => {
    if (!flashcards.length || !currentFlashcard) return false;
    if (!currentFlashcard.jsonFiles?.length) return false;
    const filesLoaded = currentFlashcard.jsonFiles.every(f => f.data !== null && f.data !== undefined);
    if (!filesLoaded || !processedData.orderedFiles.length) return false;
    
    // More thorough validation of chart data
    const firstOrderedFile = processedData.orderedFiles[0];
    if (!firstOrderedFile || !firstOrderedFile.data) return false;
    
    // Check if data is an array with content
    const isArray = Array.isArray(firstOrderedFile.data);
    if (!isArray) {
      // Log for debugging
      if (process.env.NODE_ENV === 'development') {
        console.warn('Chart data is not an array:', {
          type: typeof firstOrderedFile.data,
          data: firstOrderedFile.data,
          fileName: firstOrderedFile.fileName,
        });
      }
      return false;
    }
    
    return firstOrderedFile.data.length > 0;
  }, [flashcards, currentFlashcard, processedData]);

  // Handlers
  const handleNextCard = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[FlashcardsContainer] handleNextCard called', {
        currentIndex: gameState.currentIndex,
        flashcardsLength: flashcards.length,
        hasNextCard: typeof gameStateNextCardRef.current === 'function',
        nextIndex: gameState.currentIndex + 1,
        canAdvance: gameState.currentIndex + 1 < flashcards.length,
      });
    }

    timer.pause();
    // Use ref to get the latest nextCard function, avoiding stale closures
    if (gameStateNextCardRef.current) {
      gameStateNextCardRef.current();

      if (process.env.NODE_ENV === 'development') {
        // Log after calling nextCard to see if index changed
        setTimeout(() => {
          console.log('[FlashcardsContainer] After nextCard', {
            newCurrentIndex: gameState.currentIndex,
            flashcardsLength: flashcards.length,
          });
        }, 0);
      }
    }
    timer.reset(timerDuration);
    if (selectedFolder && timerDuration > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => timer.start());
      });
    }
  }, [timer, timerDuration, selectedFolder, flashcards.length, gameState.currentIndex]);

  useEffect(() => {
    handleNextCardRef.current = handleNextCard;
  }, [handleNextCard]);

  const handleChartClick = useCallback((coordinates: { x: number; y: number; chartX: number; chartY: number }) => {
    console.log('[FlashcardsContainer] handleChartClick called, showTutorial:', showTutorial, 'coordinates:', coordinates);
    if (!targetPoint || !priceRange || !timeRange) {
      console.log('[FlashcardsContainer] handleChartClick early return - missing data');
      return;
    }
    const mainDataLength = activeProcessedData.orderedFiles[0]?.data?.length || 0;
    console.log('[FlashcardsContainer] handleChartClick - coordinates.x:', coordinates.x, 'mainDataLength:', mainDataLength);
    if (coordinates.x <= mainDataLength - 1) {
      console.log('[FlashcardsContainer] handleChartClick early return - click before divider');
      return;
    }

    if (showTutorial) {
      console.log('[FlashcardsContainer] ====== TUTORIAL STEP 4: Dispatching tutorial-selection-made event ======');
      window.dispatchEvent(new CustomEvent('tutorial-selection-made'));
    }
    
    gameState.handleCoordinateSelection(
      coordinates,
      (distance: number, score: number, scoreData?: any) => {
        const stockSymbol = extractStockName(activeFlashcard) || 'UNKNOWN';
        const isCorrect = (scoreData?.priceAccuracy ?? score) >= SCORING_CONFIG.CORRECT_THRESHOLD;
        matchLogging.logMatchWithCoordinates({
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
  }, [gameState, timer, targetPoint, priceRange, timeRange, activeFlashcard, activeProcessedData, matchLogging, showTutorial]);

  const handleTooltipDismiss = useCallback((event?: { reason?: string }) => {
    gameState.setShowTimeUpOverlay(false);
    if (event?.reason === 'manual-chart') {
      if (timerDuration > 0) {
        timer.reset(timerDuration);
        timer.start();
      }
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (handleNextCardRef.current) {
          handleNextCardRef.current();
        }
      });
    });
  }, [gameState, timer, timerDuration]);

  const handleFolderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFolder = e.target.value;
    setSelectedFolder(newFolder);
    gameState.resetGame();
    timer.reset(timerDuration);
    if (newFolder && session?.user?.id) {
      roundManagement.loadRecentRounds(newFolder);
    }
  }, [setSelectedFolder, gameState, timer, timerDuration, roundManagement, session?.user?.id]);

  const handleTimerDurationChange = useCallback((duration: number) => {
    setTimerDuration(duration);
    timer.setDuration(duration);
  }, [timer]);

  const handleShuffleStocks = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[FlashcardsContainer] Shuffling stocks');
    }

    // Shuffle the flashcards
    shuffleFlashcards();

    // Reset game state to start from the beginning
    gameState.resetGame();

    // Reset and restart timer
    timer.reset(timerDuration);
    if (selectedFolder && timerDuration > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => timer.start());
      });
    }
  }, [shuffleFlashcards, gameState, timer, timerDuration, selectedFolder]);

  // Timer effects
  useEffect(() => {
    if (roundManagement.currentRoundId && !loading && selectedFolder && timerDuration > 0 && 
        timer.isReady && !timer.isRunning && !gameState.showTimeUpOverlay) {
      timer.reset(timerDuration);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => timer.start());
      });
    }
  }, [roundManagement.currentRoundId, loading, selectedFolder, timerDuration, timer, gameState.showTimeUpOverlay]);

  useEffect(() => {
    if (activeFlashcard && !loading && selectedFolder && timerDuration > 0 &&
        timer.isReady && !timer.isRunning && roundManagement.currentRoundId &&
        !gameState.feedback && !gameState.showTimeUpOverlay) {
      timer.reset(timerDuration);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => timer.start());
      });
    }
  }, [activeFlashcard, loading, selectedFolder, timerDuration, timer, roundManagement.currentRoundId, gameState.feedback, gameState.showTimeUpOverlay]);

  // Load pending round after flashcards are ready (when switching folders for a round)
  useEffect(() => {
    if (flashcards.length > 0 && !loading && selectedFolder) {
      roundManagement.loadPendingRoundIfReady(true, selectedFolder);
    }
  }, [flashcards.length, loading, selectedFolder, roundManagement]);

  // Show round selector when no round is selected AND rounds have been loaded
  useEffect(() => {
    if (
      !roundManagement.currentRoundId && 
      selectedFolder && 
      !roundManagement.isLoadingRounds &&
      roundManagement.roundsLoaded // Only show after rounds have been loaded
    ) {
      roundManagement.setShowRoundSelector(true);
    }
  }, [roundManagement.currentRoundId, selectedFolder, roundManagement.isLoadingRounds, roundManagement.roundsLoaded, roundManagement]);

  // Tutorial effect - handle tutorialTrigger prop (from URL params)
  useEffect(() => {
    if (!tutorialTrigger || !session?.user?.id || loading || flashcards.length === 0 || !selectedFolder) return;
    const tutorialJustTriggered = tutorialTrigger && !prevTutorialTriggerRef.current;
    if (tutorialJustTriggered) {
      prevTutorialTriggerRef.current = true;
      // Reset tutorial state first
      setShowTutorial(false);
      // Ensure we have a round for the tutorial
      if (!roundManagement.currentRoundId) {
        roundManagement.loadRecentRounds(selectedFolder, true);
      }
      // Start tutorial after a brief delay to ensure everything is ready
      setTimeout(() => {
        setShowTutorial(true);
      }, 500);
    }
  }, [tutorialTrigger, session?.user?.id, loading, flashcards.length, selectedFolder, roundManagement]);

  // Listen for replay-tutorial event
  const [tutorialKey, setTutorialKey] = useState(0);

  useEffect(() => {
    const handleReplayTutorial = () => {
      console.log('[FlashcardsContainer] Replay tutorial requested', {
        hasSession: !!session?.user?.id,
        loading,
        flashcardsLength: flashcards.length,
        selectedFolder,
        hasRound: !!roundManagement.currentRoundId
      });

      // Scroll to top first (instant for immediate positioning)
      window.scrollTo({ top: 0, behavior: 'instant' });
      
      // First, cleanly stop the current tutorial
      setShowTutorial(false);
      prevTutorialTriggerRef.current = false;

      // Check if we have all prerequisites
      if (!session?.user?.id || loading || flashcards.length === 0 || !selectedFolder) {
        console.log('[FlashcardsContainer] Missing prerequisites for tutorial restart, waiting...');
        // Wait for data to load and scroll to complete
        setTimeout(() => {
          // Ensure we're at top
          window.scrollTo({ top: 0, behavior: 'instant' });
          if (session?.user?.id && !loading && flashcards.length > 0 && selectedFolder) {
            console.log('[FlashcardsContainer] Prerequisites ready, starting tutorial');
            setTutorialKey(prev => prev + 1);
            setShowTutorial(true);
          } else {
            console.warn('[FlashcardsContainer] Prerequisites still not ready after 1s delay');
          }
        }, 1000);
        return;
      }

      // Ensure we have a round
      if (!roundManagement.currentRoundId && selectedFolder) {
        console.log('[FlashcardsContainer] Loading round for tutorial');
        roundManagement.loadRecentRounds(selectedFolder, true);
      }

      // Force remount by changing key, then start tutorial
      // Wait a bit for scroll to complete and DOM to settle
      setTutorialKey(prev => prev + 1);
      setTimeout(() => {
        // Ensure we're at top before starting
        window.scrollTo({ top: 0, behavior: 'instant' });
        console.log('[FlashcardsContainer] Starting tutorial (key:', tutorialKey + 1, ')');
        setShowTutorial(true);
      }, 300); // Give time for scroll to complete
    };

    window.addEventListener('replay-tutorial', handleReplayTutorial);
    return () => {
      window.removeEventListener('replay-tutorial', handleReplayTutorial);
    };
  }, [session?.user?.id, loading, flashcards.length, selectedFolder, roundManagement, tutorialKey]);

  // Check for session cookie immediately (memoized to prevent re-checking)
  const hasSessionCookie = useMemo(() => checkSessionCookie(), []);

  // CRITICAL: Never show landing page if we have a session cookie - this prevents the flash
  // Even if status is "unauthenticated" temporarily, if we have a cookie, show the app
  // The session will restore in the background
  if (hasSessionCookie) {
    // Continue rendering the app - session will load in background
  } else if (status === "unauthenticated" && !isAuthenticated) {
    // Only show landing page if we're confirmed unauthenticated AND have no session cookie
    return (
      <>
        <LandingPage onSignIn={() => setShowAuthModal(true)} />
        {showAuthModal && <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      </>
    );
  } else if (status === "loading") {
    // Show nothing while loading if we don't have a session cookie
    return null;
  }

  // Loading/error states - only show full-page loading if actively loading initial data
  // Allow UI to render and let ChartSection handle its own loading state
  if (loading && flashcards.length === 0 && !selectedFolder) {
    return <DataLoadingState loadingProgress={loadingProgress} loadingStep={loadingStep} selectedFolder={selectedFolder} loading={loading} error={error} isAuthenticated={true} />;
  }

  // Show error state only if there's a critical error and no data at all
  if (error && selectedFolder && flashcards.length === 0) {
    return <DataLoadingState loadingProgress={loadingProgress} loadingStep={loadingStep} selectedFolder={selectedFolder} loading={false} error={error} isAuthenticated={true} />;
  }

  // If we have a selected folder but no flashcards yet, show loading (but only briefly)
  // This prevents showing empty UI while data is being fetched
  if (selectedFolder && flashcards.length === 0 && loading) {
    return <DataLoadingState loadingProgress={loadingProgress} loadingStep={loadingStep} selectedFolder={selectedFolder} loading={loading} error={error} isAuthenticated={true} />;
  }

  return (
    <div style={{ marginTop: UI_CONFIG.CONTAINER_MARGIN_TOP }}>
      <div className="min-h-screen w-full flex justify-center items-center p-0 sm:p-4 md:p-6">
        <div className="w-full sm:max-w-[1200px] bg-transparent rounded-md overflow-hidden">
          <div className="flex flex-col lg:flex-row gap-0 items-start">
            <div className="w-full lg:w-4/5">
              <ChartView
                orderedFiles={activeProcessedData.orderedFiles}
                afterData={activeProcessedData.afterJsonData}
                pointsTextArray={[]}
                timerDisplayValue={timer.displayValue}
                feedback={gameState.feedback}
                disabled={gameState.disableButtons}
                showTimeUp={gameState.showTimeUpOverlay && !showTutorial}
                onAfterEffectComplete={() => {
                  // Animation completion event is now dispatched directly in useScoreCalculation
                  // when the animation actually completes, not after the 5-second delay
                }}
                onChartClick={handleChartClick}
                userSelection={gameState.userSelection}
                targetPoint={targetPoint}
                distance={gameState.distance}
                score={gameState.score}
                onNextCard={handleNextCard}
                timerDuration={timerDuration}
                onTimerDurationChange={handleTimerDurationChange}
                onPauseStateChange={(paused: boolean) => { isChartPausedRef.current = paused; }}
                onTimerPause={() => timer.pause()}
                onDismissTooltip={handleTooltipDismiss}
              />
              <PredictionPanel
                userSelection={gameState.userSelection}
                targetPoint={targetPoint}
                distance={gameState.distance}
                score={gameState.score}
                feedback={gameState.feedback}
                disabled={gameState.disableButtons}
                onDismissTooltip={handleTooltipDismiss}
                showTimeUp={gameState.showTimeUpOverlay && !showTutorial}
              />
            </div>
            <div className="w-full lg:w-1/5">
              <ControlPanel
                selectedFolder={selectedFolder}
                folderOptions={folders}
                onFolderChange={handleFolderChange}
                pointsTextArray={activeProcessedData.pointsTextArray}
                accuracy={gameState.metrics.accuracy}
                matchCount={gameState.metrics.matchCount}
                correctCount={gameState.metrics.correctCount}
                onRoundHistory={() => setShowRoundHistory(true)}
                onNewRound={roundManagement.handleNewRound}
                isCreatingRound={roundManagement.isCreatingRound}
                onShuffleStocks={handleShuffleStocks}
              />
            </div>
          </div>
          <div className="mt-0 mb-20">
            <DateFolderBrowser
              session={session}
              currentStock={extractStockName(activeFlashcard)}
              flashcards={flashcards as FlashcardData[]}
              currentFlashcard={activeFlashcard}
              onChartExpanded={() => {
                if (!timer.isRunning && timerDuration > 0) {
                  timer.reset(timerDuration);
                  timer.start();
                }
              }}
            />
          </div>
        </div>
      </div>

      {showRoundHistory && (
        <RoundHistory
          isOpen={showRoundHistory}
          onClose={() => {
            setShowRoundHistory(false);
            setTimeout(() => matchLogging.triggerRoundHistoryRefresh(), 500);
          }}
          onLoadRound={(roundId: string, datasetName: string) => {
            roundManagement.handleSelectRound(roundId, datasetName);
            setShowRoundHistory(false);
          }}
          userId={session?.user?.id}
          onRefresh={matchLogging.setRoundHistoryRefresh}
        />
      )}

      <RoundSelector
        isOpen={roundManagement.showRoundSelector}
        roundName={roundManagement.roundNameInput}
        availableRounds={roundManagement.availableRounds}
        isCreatingRound={roundManagement.isCreatingRound}
        onRoundNameChange={roundManagement.handleRoundNameChange}
        onGenerateRoundName={() => roundManagement.setRoundNameInput(roundManagement.handleGenerateRoundName())}
        onCreateRound={roundManagement.handleConfirmNewRound}
        onSelectRound={roundManagement.handleRoundSelectorSelect}
        onCancel={roundManagement.handleRoundSelectorCancel}
      />

      {showTutorial && (
        <Tutorial
          key={`tutorial-${tutorialKey}`}
          isActive={showTutorial}
          onComplete={() => {
            setShowTutorial(false);
            if (timerDuration > 0 && !timer.isRunning) timer.start();
          }}
          onSkip={() => {
            setShowTutorial(false);
            if (timerDuration > 0 && !timer.isRunning) timer.start();
          }}
          timer={{
            pause: timer.pause,
            resume: () => { if (timerDuration > 0) timer.start(); },
            isRunning: timer.isRunning,
          }}
        />
      )}
    </div>
  );
}

