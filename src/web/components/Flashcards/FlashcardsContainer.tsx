/**
 * @fileoverview Thin orchestrator for flashcard study workflow.
 * @module src/web/components/Flashcards/FlashcardsContainer.tsx
 * @dependencies React, hooks, components
 */
"use client";

import React, { useMemo, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// Components
import { DateFolderBrowser, LandingPage, RoundHistory } from "../";
import { AuthModal } from "../Auth";
import Tutorial from "../Tutorial/Tutorial";
import ChartView from "./components/ChartView";
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
import { processFlashcardData, extractStockName, FlashcardData } from "./utils/dataProcessors";
import { UI_CONFIG, TIMER_CONFIG } from "./constants";
import { SCORING_CONFIG } from "@/config/game.config";

interface FlashcardsContainerProps {
  tutorialTrigger?: boolean;
}

export default function FlashcardsContainer({ tutorialTrigger = false }: FlashcardsContainerProps) {
  const { data: session, status } = useSession();
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
      fetch(`/api/game/rounds/${roundManagement.currentRoundId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      }).then(() => matchLogging.triggerRoundHistoryRefresh()).catch(console.error);
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
    return flashcards[safeIndex] || null;
  }, [gameState.currentIndex, flashcards]);

  const processedData = useMemo(() => processFlashcardData(currentFlashcard), [currentFlashcard]);
  const { targetPoint, priceRange, timeRange } = useTargetPoint(processedData);

  const activeFlashcard = currentFlashcard;
  const activeProcessedData = processedData;
  const currentFlashcardReady = useMemo(() => {
    if (!flashcards.length || !currentFlashcard) return false;
    if (!currentFlashcard.jsonFiles?.length) return false;
    const filesLoaded = currentFlashcard.jsonFiles.every(f => f.data !== null && f.data !== undefined);
    if (!filesLoaded || !processedData.orderedFiles.length) return false;
    return Array.isArray(processedData.orderedFiles[0]?.data) && processedData.orderedFiles[0].data.length > 0;
  }, [flashcards, currentFlashcard, processedData]);

  // Handlers
  const handleNextCard = useCallback(() => {
    timer.pause();
    gameState.nextCard();
    timer.reset(timerDuration);
    if (selectedFolder && timerDuration > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => timer.start());
      });
    }
  }, [gameState, timer, timerDuration, selectedFolder]);

  useEffect(() => {
    handleNextCardRef.current = handleNextCard;
  }, [handleNextCard]);

  const handleChartClick = useCallback((coordinates: { x: number; y: number; chartX: number; chartY: number }) => {
    if (!targetPoint || !priceRange || !timeRange) return;
    const mainDataLength = activeProcessedData.orderedFiles[0]?.data?.length || 0;
    if (coordinates.x <= mainDataLength - 1) return;
    
    if (showTutorial) {
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

  // Show round selector when no round is selected
  useEffect(() => {
    if (!roundManagement.currentRoundId && selectedFolder && !roundManagement.isLoadingRounds) {
      roundManagement.setShowRoundSelector(true);
    }
  }, [roundManagement.currentRoundId, selectedFolder, roundManagement.isLoadingRounds, roundManagement]);

  // Tutorial effect
  useEffect(() => {
    if (!tutorialTrigger || !session?.user?.id || loading || flashcards.length === 0 || !selectedFolder) return;
    const tutorialJustTriggered = tutorialTrigger && !prevTutorialTriggerRef.current;
    if (tutorialJustTriggered) {
      prevTutorialTriggerRef.current = true;
      setShowTutorial(false);
      setTimeout(() => setShowTutorial(true), 200);
      if (!roundManagement.currentRoundId) {
        roundManagement.loadRecentRounds(selectedFolder, true);
      }
      setTimeout(() => setShowTutorial(true), 1500);
    }
  }, [tutorialTrigger, session?.user?.id, loading, flashcards.length, selectedFolder, roundManagement]);

  // Show landing page for unauthenticated users
  if (status !== "authenticated" || !session) {
    return (
      <>
        <LandingPage onSignIn={() => setShowAuthModal(true)} />
        {showAuthModal && <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />}
      </>
    );
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
        <div className="w-full sm:max-w-[1000px] bg-transparent rounded-md overflow-hidden">
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
                onAfterEffectComplete={() => {}}
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
              />
            </div>
          </div>
          <div className="mt-4 lg:mt-2 mb-20">
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
            setTimeout(() => matchLogging.roundHistoryRefresh?.(), 500);
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

      <Tutorial
        key={`tutorial-${showTutorial}-${tutorialTrigger}`}
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
    </div>
  );
}

