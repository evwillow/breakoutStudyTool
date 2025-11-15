/**
 * @fileoverview Manages flashcard drill state, scoring, and navigation callbacks for the study experience.
 * @module src/web/components/Flashcards/hooks/useGameState.ts
 * @dependencies React, ../constants, ../utils/coordinateUtils, @breakout-study-tool/shared
 */
/**
 * @hook useGameState
 * @overview Manages flashcard drill progression, chart selections, metrics, and callback orchestration.
 * @usage ```ts
 * const game = useGameState({ flashcardsLength: cards.length, onGameComplete });
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GAME_CONFIG } from '../constants';
import type { 
  GameMetrics, 
  GameState, 
  ChartCoordinate 
} from '@breakout-study-tool/shared';
import type { UseGameStateOptions } from '@breakout-study-tool/shared';
import { evaluateCoordinateSelection, updateMatchMetrics, calculateAccuracy, summarizeExistingMatches } from '@/services/flashcard/gameLogic';
import type { ProcessedStockDataPoint } from '@/components/StockChart/StockChart.types';
import { calculateDistanceScore } from '../utils/coordinateUtils';

// Re-export for backward compatibility
export type { GameMetrics, GameState, ChartCoordinate, UseGameStateOptions };

// UseGameStateReturn needs to be defined here as it extends GameState with additional methods
export interface UseGameStateReturn extends GameState {
  // Actions
  handleSelection: (buttonIndex: number, onResult?: (isCorrect: boolean) => void) => void;
  handleCoordinateSelection: (
    coordinates: ChartCoordinate,
    onResult?: (distance: number, score: number, scoreData?: ReturnType<typeof calculateDistanceScore>) => void,
    target?: ChartCoordinate,
    priceRange?: { min: number; max: number },
    timeRange?: { min: number; max: number }
  ) => void;
  nextCard: () => void;
  resetGame: () => void;
  initializeFromMatches: (matches: Array<{ correct: boolean }>) => void;
  setAfterChartData: (data: ProcessedStockDataPoint[] | null) => void;
  setShowTimeUpOverlay: (show: boolean) => void;
  setCurrentIndex: (index: number) => void;
  
  // Computed values
  selectedButtonIndex: number | null;
  correctAnswerButton: number | null;
  userSelection: ChartCoordinate | null;
  targetPoint: ChartCoordinate | null;
  distance: number | null;
  score: number | null;
  isGameComplete: boolean;
}

// UseGameStateOptions is imported from shared types above

export function useGameState({
  flashcardsLength,
  onCorrectAnswer,
  onIncorrectAnswer,
  onGameComplete,
}: UseGameStateOptions): UseGameStateReturn {
  // Core game state
  /** Index of the currently active flashcard. */
  const [currentIndex, setCurrentIndex] = useState(0);
  /** Stores whether the last answer was correct/incorrect for UI feedback. */
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  /** Disables answer buttons after submission. */
  const [disableButtons, setDisableButtons] = useState(false);
  /** Shows overlay when timer expires before a selection. */
  const [showTimeUpOverlay, setShowTimeUpOverlay] = useState(false);
  /** After-chart data supplied once drill completes. */
  const [afterChartData, setAfterChartData] = useState<ProcessedStockDataPoint[] | null>(null);
  const [userSelectedButton, setUserSelectedButton] = useState<number | null>(null);
  const [correctAnswerButton, setCorrectAnswerButton] = useState<number | null>(null);
  
  // Coordinate-based selection state
  /** User's chart selection coordinate. */
  const [userSelection, setUserSelection] = useState<ChartCoordinate | null>(null);
  /** Actual target coordinate used for scoring visualizations. */
  const [targetPoint, setTargetPoint] = useState<ChartCoordinate | null>(null);
  /** Distance (pixels) between guess and target. */
  const [distance, setDistance] = useState<number | null>(null);
  /** Calculated accuracy score (0-100). */
  const [score, setScore] = useState<number | null>(null);
  
  // Game metrics
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  // Refs for stable references
  const actionButtonsRef = useRef<HTMLDivElement>(null);
  
  // Store flashcardsLength in state so it updates reactively when flashcards load
  const [trackedFlashcardsLength, setTrackedFlashcardsLength] = useState(flashcardsLength);
  
  // Track if flashcards have been initialized to prevent rapid flipping on initial load
  const hasInitializedRef = useRef<boolean>(false);
  const lastFlashcardsLengthRef = useRef<number>(0);

  // Update tracked length when prop changes (flashcards loading dynamically)
  // Handle both increases (lazy loading) and resets (folder changes)
  useEffect(() => {
    const wasEmpty = lastFlashcardsLengthRef.current === 0;
    const isEmpty = flashcardsLength === 0;
    const isFirstLoad = wasEmpty && !isEmpty && !hasInitializedRef.current;

    // Always update if length increases (lazy loading scenario)
    if (flashcardsLength > trackedFlashcardsLength) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useGameState] Flashcards length increased:', {
          previousLength: trackedFlashcardsLength,
          newLength: flashcardsLength,
          currentIndex,
        });
      }
      setTrackedFlashcardsLength(flashcardsLength);
    }
    // Also update if length decreases significantly (folder change scenario)
    // This prevents stale length when switching folders
    else if (flashcardsLength < trackedFlashcardsLength && flashcardsLength > 0) {
      setTrackedFlashcardsLength(flashcardsLength);
      // Reset index when folder changes (length decreases)
      setCurrentIndex(0);
      hasInitializedRef.current = false;
    }
    // Reset to 0 if flashcards array is cleared
    else if (isEmpty && trackedFlashcardsLength > 0) {
      setTrackedFlashcardsLength(0);
      setCurrentIndex(0);
      hasInitializedRef.current = false;
    }

    // On first load (flashcards go from 0 to >0), reset index to 0 and mark as initialized
    if (isFirstLoad) {
      setCurrentIndex(0);
      hasInitializedRef.current = true;
      if (process.env.NODE_ENV === 'development') {
        console.log('[useGameState] First load detected, resetting currentIndex to 0', {
          flashcardsLength,
          previousLength: lastFlashcardsLengthRef.current,
        });
      }
    }

    // Clamp currentIndex if it's out of bounds (e.g., if flashcards array changed)
    if (flashcardsLength > 0 && currentIndex >= flashcardsLength) {
      const clampedIndex = Math.max(0, flashcardsLength - 1);
      if (process.env.NODE_ENV === 'development') {
        console.log('[useGameState] Clamping currentIndex', {
          currentIndex,
          flashcardsLength,
          clampedIndex,
        });
      }
      setCurrentIndex(clampedIndex);
    }

    lastFlashcardsLengthRef.current = flashcardsLength;
  }, [flashcardsLength, trackedFlashcardsLength, currentIndex]);
  
  // Computed values
  // Accuracy is calculated as percentage of selections that are "correct"
  // A selection is "correct" if priceAccuracy >= 70% (stock price prediction accuracy)
  const accuracy = calculateAccuracy(matchCount, correctCount);
  const selectedButtonIndex = userSelectedButton;
  // Fix edge case: when length is 0, game is not complete (can't be complete with no cards)
  // When length is 1, index 0 means we're on the last card
  const isGameComplete = trackedFlashcardsLength > 0 && currentIndex >= trackedFlashcardsLength - 1;
  
  // Handle user selection
  const handleSelection = useCallback((buttonIndex: number, onResult?: (isCorrect: boolean) => void) => {
    if (disableButtons && !showTimeUpOverlay) return;
    
    // Clear time up overlay when user makes selection
    if (showTimeUpOverlay) {
      setShowTimeUpOverlay(false);
    }
    
    // Disable buttons to prevent multiple selections
    setDisableButtons(true);
    
    // Set the user's selection
    setUserSelectedButton(buttonIndex);
    
    // Note: Button-based selection is deprecated in favor of coordinate-based selection
    // This handler remains for backward compatibility but is no longer used
    const isCorrect = false; // Always false since thingData is no longer used
    const correctButtonIndex = null;
    
    // Set the correct answer for display
    setCorrectAnswerButton(correctButtonIndex);
    
    // Call the result callback immediately
    if (onResult) {
      onResult(isCorrect);
    }
    
    // Update metrics
    setMatchCount(prev => prev + 1);
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      onCorrectAnswer?.();
    } else {
      onIncorrectAnswer?.();
    }
    
    // Set feedback
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    // Scroll to action buttons for better UX
    if (actionButtonsRef.current) {
      actionButtonsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
    
  }, [
    disableButtons,
    showTimeUpOverlay,
    currentMatchIndex,
    onCorrectAnswer,
    onIncorrectAnswer,
  ]);

  // Handle coordinate-based selection
  const handleCoordinateSelection = useCallback((
    coordinates: ChartCoordinate,
    onResult?: (distance: number, score: number, scoreData?: ReturnType<typeof calculateDistanceScore>) => void,
    target?: ChartCoordinate,
    priceRange?: { min: number; max: number },
    timeRange?: { min: number; max: number }
  ) => {
    // Allow selection even if buttons are disabled - user might be using magnifier
    // Only block if we already have a selection (score exists)
    if (score !== null && score !== undefined && !showTimeUpOverlay) return;
    
    // Clear time up overlay when user makes selection
    if (showTimeUpOverlay) {
      setShowTimeUpOverlay(false);
    }
    
    // Disable buttons to prevent multiple selections
    setDisableButtons(true);
    
    // Set the user's selection
    setUserSelection(coordinates);
    
    // Calculate distance and score if target and ranges are provided
    if (target && priceRange && timeRange) {
      const selectionResult = evaluateCoordinateSelection({
        coordinates,
        target,
        priceRange,
        timeRange
      });
      
      setDistance(selectionResult.distance);
      setScore(selectionResult.score);
      setTargetPoint(target);
      
      // Update metrics based on price accuracy (primary metric for stock trading)
      // Threshold at 70% price accuracy for "correct"
      const updatedMetrics = updateMatchMetrics(
        { matchCount, correctCount },
        selectionResult.isCorrect
      );
      setMatchCount(updatedMetrics.matchCount);
      setCorrectCount(updatedMetrics.correctCount);
      if (selectionResult.isCorrect) {
        onCorrectAnswer?.();
      } else {
        onIncorrectAnswer?.();
      }
      
      // Set feedback based on price accuracy
      setFeedback(selectionResult.isCorrect ? 'correct' : 'incorrect');
      
      // Call result callback with full score data
      if (onResult) {
        onResult(
          selectionResult.distance ?? 0,
          selectionResult.score ?? 0,
          selectionResult.scoreData
        );
      }
    }
  }, [
    disableButtons,
    showTimeUpOverlay,
    onCorrectAnswer,
    onIncorrectAnswer,
    score,
    matchCount,
    correctCount,
  ]);
  
  // Move to next card
  const nextCard = useCallback(() => {
    console.log('[useGameState] ====== nextCard CALLED ======');

    // Reset card-specific state FIRST to clear the current card's state
    // This MUST be done OUTSIDE the setCurrentIndex callback to avoid race conditions
    setFeedback(null);
    setDisableButtons(false);
    setShowTimeUpOverlay(false);
    setAfterChartData(null);
    setUserSelectedButton(null);
    setCorrectAnswerButton(null);
    setUserSelection(null);
    setTargetPoint(null);
    setDistance(null);
    setScore(null);

    // Use functional updates to avoid stale closures
    setCurrentIndex(prevIndex => {
      // Get current flashcardsLength from the latest value
      const actualLength = flashcardsLength;

      console.log('[useGameState] nextCard - prevIndex:', prevIndex, 'actualLength:', actualLength, 'trackedLength:', trackedFlashcardsLength);

      // Move to next card
      if (actualLength > 0) {
        const nextIndex = prevIndex + 1;

        console.log('[useGameState] Attempting to advance from index', prevIndex, 'to', nextIndex, '(max:', actualLength - 1, ')');

        if (nextIndex < actualLength) {
          console.log('[useGameState] ====== ADVANCING TO NEXT CARD: index', nextIndex, '======');
          setCurrentMatchIndex(prevMatch => prevMatch + 1);
          return nextIndex;
        } else {
          // At the end of the deck, trigger game complete
          console.log('[useGameState] At end of deck (index', prevIndex, 'of', actualLength - 1, '), NOT advancing');
          if (onGameComplete) {
            console.log('[useGameState] Calling onGameComplete');
            onGameComplete();
          }
          return prevIndex; // Stay at current index (last card)
        }
      } else {
        // No flashcards but game complete callback exists
        console.log('[useGameState] No flashcards available, NOT advancing');
        if (onGameComplete) {
          console.log('[useGameState] Calling onGameComplete (no flashcards)');
          onGameComplete();
        }
        return prevIndex;
      }
    });
  }, [flashcardsLength, onGameComplete, trackedFlashcardsLength]);
  
  // Initialize game state from existing matches
  const initializeFromMatches = useCallback((matches: Array<{ correct: boolean }>) => {
    const summary = summarizeExistingMatches(matches);
    
    console.log('Initializing game state from matches:', {
      totalMatches: summary.totalMatches,
      correctMatches: summary.correctMatches,
      accuracy: summary.accuracy
    });
    
    setMatchCount(summary.totalMatches);
    setCorrectCount(summary.correctMatches);
    setCurrentMatchIndex(summary.totalMatches);
  }, []);

  // Reset entire game state
  const resetGame = useCallback(() => {
    setCurrentIndex(0);
    setCurrentMatchIndex(0);
    setMatchCount(0);
    setCorrectCount(0);
    setFeedback(null);
    setDisableButtons(false);
    setShowTimeUpOverlay(false);
    setAfterChartData(null);
    setUserSelectedButton(null);
    setCorrectAnswerButton(null);
    setUserSelection(null);
    setTargetPoint(null);
    setDistance(null);
    setScore(null);
    // Reset tracked length to current flashcardsLength to sync with fresh data
    setTrackedFlashcardsLength(flashcardsLength);
    // Reset initialization flag so first load logic can run again if needed
    hasInitializedRef.current = false;
  }, [flashcardsLength]);
  
  return {
    // State
    currentIndex,
    feedback,
    disableButtons,
    showTimeUpOverlay,
    afterChartData,
    metrics: {
      currentMatchIndex,
      matchCount,
      correctCount,
      accuracy,
    },
    
    // Actions
    handleSelection,
    handleCoordinateSelection,
    nextCard,
    resetGame,
    initializeFromMatches,
    setAfterChartData,
    setShowTimeUpOverlay,
    setCurrentIndex,
    
    // Computed
    selectedButtonIndex,
    correctAnswerButton,
    userSelection,
    targetPoint,
    distance,
    score,
    isGameComplete,
  };
} 