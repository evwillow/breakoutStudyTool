/**
 * @fileoverview Shared flashcard data type definitions.
 * @module lib/shared/src/types/flashcard.ts
 * @dependencies none
 */
/**
 * Flashcard Types
 * 
 * Centralized type definitions for flashcard data and operations.
 */

/**
 * Flashcard file structure
 */
export interface FlashcardFile {
  fileName: string;
  data: any;
}

/**
 * Flashcard data structure
 */
export interface FlashcardData {
  id?: string;
  name?: string;
  folderName?: string;
  jsonFiles: FlashcardFile[];
  isReady?: boolean;
}

/**
 * Processed flashcard data
 */
export interface ProcessedFlashcardData {
  orderedFiles: FlashcardFile[];
  afterJsonData: any;
  pointsTextArray: string[];
}

/**
 * Folder option for flashcard selection
 */
export interface FolderOption {
  key: string;
  value: string;
  label: string;
}

/**
 * Use flashcard data return type
 */
export interface UseFlashcardDataReturn {
  // Data
  folders: FolderOption[];
  flashcards: FlashcardData[];
  selectedFolder: string | null;
  currentFlashcard: FlashcardData | null;
  
  // Loading states
  loading: boolean;
  loadingProgress: number;
  loadingStep: string;
  error: string | null;
  
  // Actions
  setSelectedFolder: (folder: string | null) => void;
  refetchFolders: () => Promise<void>;
  refetchFlashcards: () => Promise<void>;
  clearError: () => void;
}

/**
 * Use flashcard data options
 */
export interface UseFlashcardDataOptions {
  currentIndex?: number;
  autoSelectFirstFolder?: boolean;
}

// Re-export GameState from game types and ChartCoordinate from chart types
import type { GameState } from './game';
import type { ChartCoordinate } from './chart';

/**
 * Use game state return type
 */
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

/**
 * Use game state options
 */
export interface UseGameStateOptions {
  flashcardsLength: number;
  onCorrectAnswer?: () => void;
  onIncorrectAnswer?: () => void;
  onGameComplete?: () => void;
}

/**
 * Use timer options
 */
export interface UseTimerOptions {
  initialDuration?: number;
  onTimeUp?: () => void;
  autoStart?: boolean;
}

/**
 * Use timer return type
 */
export interface UseTimerReturn {
  timer: number;
  isRunning: boolean;
  isPaused: boolean;
  isReady: boolean;
  displayValue: number;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: (duration?: number) => void;
  setDuration: (duration: number) => void;
}

