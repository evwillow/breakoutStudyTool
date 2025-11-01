/**
 * Game State Hook
 * Manages game state, metrics, and user interactions
 */

import { useState, useCallback, useRef } from 'react';
import { GAME_CONFIG } from '../constants';
import { calculateDistance, calculateDistanceScore, ChartCoordinate } from '../utils/coordinateUtils';

export interface GameMetrics {
  currentMatchIndex: number;
  matchCount: number;
  correctCount: number;
  accuracy: number;
}

export interface GameState {
  currentIndex: number;
  feedback: 'correct' | 'incorrect' | null;
  disableButtons: boolean;
  showTimeUpOverlay: boolean;
  afterChartData: any;
  metrics: GameMetrics;
}

export interface ChartCoordinate {
  x: number;
  y: number;
  chartX?: number;
  chartY?: number;
}

export interface UseGameStateReturn extends GameState {
  // Actions
  handleSelection: (buttonIndex: number, onResult?: (isCorrect: boolean) => void) => void;
  handleCoordinateSelection: (coordinates: ChartCoordinate, onResult?: (distance: number, score: number) => void) => void;
  nextCard: () => void;
  resetGame: () => void;
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

export interface UseGameStateOptions {
  flashcardsLength: number;
  thingData: number[];
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameComplete?: () => void;
}

export function useGameState({
  flashcardsLength,
  thingData,
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
  
  // Computed values
  const accuracy = matchCount > 0 ? Math.round((correctCount / matchCount) * 100) : 0;
  const selectedButtonIndex = userSelectedButton;
  const isGameComplete = currentIndex >= flashcardsLength - 1;
  
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
    
    // Check if answer is correct
    const correctAnswer = thingData[currentMatchIndex];
    const correctButtonIndex = correctAnswer - 1;
    const isCorrect = buttonIndex === correctButtonIndex;
    
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
    thingData,
    currentMatchIndex,
    onCorrectAnswer,
    onIncorrectAnswer,
  ]);

  // Handle coordinate-based selection
  const handleCoordinateSelection = useCallback((
    coordinates: ChartCoordinate,
    onResult?: (distance: number, score: number) => void,
    target?: ChartCoordinate,
    priceRange?: { min: number; max: number },
    timeRange?: { min: number; max: number }
  ) => {
    if (disableButtons && !showTimeUpOverlay) return;
    
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
      const calculatedScore = calculateDistanceScore(coordinates, target, priceRange, timeRange);
      
      setDistance(calculatedDistance);
      setScore(calculatedScore);
      setTargetPoint(target);
      
      // Update metrics based on score (threshold at 70% for "correct")
      const isCorrect = calculatedScore >= 70;
      setMatchCount(prev => prev + 1);
      if (isCorrect) {
        setCorrectCount(prev => prev + 1);
        onCorrectAnswer?.();
      } else {
        onIncorrectAnswer?.();
      }
      
      // Set feedback based on score
      setFeedback(isCorrect ? 'correct' : 'incorrect');
      
      // Call result callback
      if (onResult) {
        onResult(calculatedDistance, calculatedScore);
      }
    }
  }, [
    disableButtons,
    showTimeUpOverlay,
    onCorrectAnswer,
    onIncorrectAnswer,
  ]);
  
  // Move to next card
  const nextCard = useCallback(() => {
    if (currentIndex < flashcardsLength - 1) {
      setCurrentIndex(prev => prev + 1);
      setCurrentMatchIndex(prev => prev + 1);
    } else if (isGameComplete) {
      onGameComplete?.();
    }
    
    // Reset card-specific state
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
  }, [currentIndex, flashcardsLength, isGameComplete, onGameComplete]);
  
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
  }, []);
  
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