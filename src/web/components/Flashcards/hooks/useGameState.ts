/**
 * Game State Hook
 * Manages game state, metrics, and user interactions
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { GAME_CONFIG } from '../constants';
import { calculateDistance, calculateDistanceScore } from '../utils/coordinateUtils';
import type { 
  GameMetrics, 
  GameState, 
  ChartCoordinate 
} from '@breakout-study-tool/shared';
import type { UseGameStateOptions } from '@breakout-study-tool/shared';

// Re-export for backward compatibility
export type { GameMetrics, GameState, ChartCoordinate, UseGameStateOptions };

// UseGameStateReturn needs to be defined here as it extends GameState with additional methods
export interface UseGameStateReturn extends GameState {
  // Actions
  handleSelection: (buttonIndex: number, onResult?: (isCorrect: boolean) => void) => void;
  handleCoordinateSelection: (
    coordinates: ChartCoordinate,
    onResult?: (distance: number, score: number, scoreData?: any) => void,
    target?: ChartCoordinate,
    priceRange?: { min: number; max: number },
    timeRange?: { min: number; max: number }
  ) => void;
  nextCard: () => void;
  resetGame: () => void;
  initializeFromMatches: (matches: Array<{ correct: boolean }>) => void;
  setAfterChartData: (data: any) => void;
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [disableButtons, setDisableButtons] = useState(false);
  const [showTimeUpOverlay, setShowTimeUpOverlay] = useState(false);
  const [afterChartData, setAfterChartData] = useState<any>(null);
  const [userSelectedButton, setUserSelectedButton] = useState<number | null>(null);
  const [correctAnswerButton, setCorrectAnswerButton] = useState<number | null>(null);
  
  // Coordinate-based selection state
  const [userSelection, setUserSelection] = useState<ChartCoordinate | null>(null);
  const [targetPoint, setTargetPoint] = useState<ChartCoordinate | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);
  
  // Game metrics
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  
  // Refs for stable references
  const actionButtonsRef = useRef<HTMLDivElement>(null);
  
  // Store flashcardsLength in state so it updates reactively when flashcards load
  const [trackedFlashcardsLength, setTrackedFlashcardsLength] = useState(flashcardsLength);
  
  // Update tracked length when prop changes (flashcards loading dynamically)
  // Handle both increases (lazy loading) and resets (folder changes)
  useEffect(() => {
    // Always update if length increases (lazy loading scenario)
    if (flashcardsLength > trackedFlashcardsLength) {
      setTrackedFlashcardsLength(flashcardsLength);
    }
    // Also update if length decreases significantly (folder change scenario)
    // This prevents stale length when switching folders
    else if (flashcardsLength < trackedFlashcardsLength && flashcardsLength > 0) {
      setTrackedFlashcardsLength(flashcardsLength);
    }
    // Reset to 0 if flashcards array is cleared
    else if (flashcardsLength === 0 && trackedFlashcardsLength > 0) {
      setTrackedFlashcardsLength(0);
    }
  }, [flashcardsLength, trackedFlashcardsLength]);
  
  // Computed values
  // Accuracy is calculated as percentage of selections that are "correct"
  // A selection is "correct" if priceAccuracy >= 70% (stock price prediction accuracy)
  const accuracy = matchCount > 0 ? Math.round((correctCount / matchCount) * 100) : 0;
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
    onResult?: (distance: number, score: number, scoreData?: any) => void,
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
      const calculatedDistance = calculateDistance(coordinates, target);
      const scoreData = calculateDistanceScore(coordinates, target, priceRange, timeRange);
      
      setDistance(calculatedDistance);
      setScore(scoreData.score);
      setTargetPoint(target);
      
      // Update metrics based on price accuracy (primary metric for stock trading)
      // Threshold at 70% price accuracy for "correct"
      const isCorrect = scoreData.priceAccuracy >= 70;
      setMatchCount(prev => prev + 1);
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        onCorrectAnswer?.();
      } else {
        onIncorrectAnswer?.();
      }
      
      // Set feedback based on price accuracy
      setFeedback(isCorrect ? 'correct' : 'incorrect');
      
      // Call result callback with full score data
      if (onResult) {
        onResult(calculatedDistance, scoreData.score, scoreData);
      }
    }
  }, [
    disableButtons,
    showTimeUpOverlay,
    onCorrectAnswer,
    onIncorrectAnswer,
    score,
  ]);
  
  // Move to next card
  const nextCard = useCallback(() => {
    // Reset card-specific state FIRST to clear the current card's state
    // This ensures the UI updates immediately
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
    
    // Then move to next card - use functional update to ensure we're using the latest index
    if (trackedFlashcardsLength > 0) {
      setCurrentIndex(prev => {
        const nextIndex = prev + 1;
        if (nextIndex < trackedFlashcardsLength) {
          setCurrentMatchIndex(prevMatch => prevMatch + 1);
          return nextIndex;
        } else {
          // At the end of the deck, trigger game complete
          if (onGameComplete) {
            onGameComplete();
          }
          return prev; // Stay at current index (last card)
        }
      });
    } else if (onGameComplete) {
      // No flashcards but game complete callback exists
      onGameComplete();
    }
  }, [trackedFlashcardsLength, onGameComplete]);
  
  // Initialize game state from existing matches
  const initializeFromMatches = useCallback((matches: Array<{ correct: boolean }>) => {
    const totalMatches = matches.length;
    const correctMatches = matches.filter(m => m.correct).length;
    
    console.log('Initializing game state from matches:', {
      totalMatches,
      correctMatches,
      accuracy: totalMatches > 0 ? Math.round((correctMatches / totalMatches) * 100) : 0
    });
    
    setMatchCount(totalMatches);
    setCorrectCount(correctMatches);
    // Set current match index to the number of matches (so next match is at this index)
    setCurrentMatchIndex(totalMatches);
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