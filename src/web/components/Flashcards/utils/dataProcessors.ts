/**
 * @fileoverview Helper functions for processing flashcard datasets, JSON files, and validation.
 * @module src/web/components/Flashcards/utils/dataProcessors.ts
 * @dependencies ../constants, @breakout-study-tool/shared
 */
/**
 * Data Processing Utilities
 * Handles flashcard data transformation and validation
 */

export { 
  isValidUUID,
  extractOrderedFiles,
  extractAfterJsonData,
  extractPointsTextArray,
  processFlashcardData,
  validateFlashcardData,
  extractStockName,
  isMobileDevice
} from '@/services/flashcard/flashcardUtils';