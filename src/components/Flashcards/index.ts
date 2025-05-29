/**
 * Flashcards Module Exports
 * Centralized exports for the optimized flashcards module
 */

// Main component
export { default as FlashcardsContainer } from './FlashcardsContainer';

// Hooks
export { useTimer } from './hooks/useTimer';
export { useGameState } from './hooks/useGameState';
export { useFlashcardData } from './hooks/useFlashcardData';

// Utils
export * from './utils/dataProcessors';

// Constants
export * from './constants';

// Components
export { LoadingStates } from './components/LoadingStates'; 