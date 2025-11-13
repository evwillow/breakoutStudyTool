/**
 * @fileoverview Re-exports configuration constants from centralized config files.
 * @module src/web/components/Flashcards/constants.ts
 * @dependencies @/config/game.config
 * 
 * @deprecated This file is maintained for backward compatibility.
 * New code should import directly from @/config/game.config
 */

// Re-export from centralized config
export {
  TIMER_CONFIG,
  GAME_CONFIG,
  ANIMATION_CONFIG,
  API_CONFIG,
  FILE_PATTERNS,
  ERROR_MESSAGES,
  LOADING_STATES,
  type LoadingState,
} from '@/config/game.config';

// UI Configuration (component-specific, kept here)
export const UI_CONFIG = {
  CONTAINER_MARGIN_TOP: "-20px",
  LOADING_PROGRESS_STEPS: {
    INITIALIZING: 0,
    LOADING_FLASHCARDS: 30,
    PROCESSING_DATA: 60,
    FINALIZING: 90,
    COMPLETE: 100,
  },
} as const; 