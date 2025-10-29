/**
 * Application Constants
 * Centralized configuration for the Flashcards application
 */

// Timer Configuration
export const TIMER_CONFIG = {
  INITIAL_DURATION: 60,
  UPDATE_INTERVAL: 1000,
  ANIMATION_FRAME_THRESHOLD: 1000,
} as const;

// Game Configuration
export const GAME_CONFIG = {
  ACTION_BUTTONS: ["-5%", "0%", "20%", "50%"],
  REQUIRED_FILES: ["D.json", "H.json", "M.json"],
  OPTIONAL_FILES: ["after.json", "points.json", "thing.json"],
  MOBILE_BREAKPOINT: 1024,
} as const;

// Animation Configuration
export const ANIMATION_CONFIG = {
  INITIAL_DELAY: 1500,
  ZOOM_DURATION: 1500,
  REVEAL_DURATION: 1800,
  OBSERVATION_DELAY: 5000,
} as const;

// API Configuration
export const API_CONFIG = {
  INITIAL_LOAD_LIMIT: 5,
  RETRY_ATTEMPTS: 3,
  TIMEOUT_DURATION: 30000,
} as const;

// UI Configuration
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

// File Processing
export const FILE_PATTERNS = {
  DAILY: /d\.json$/i,
  HOURLY: /h\.json$/i,
  MINUTE: /m\.json$/i,
  AFTER: /after\.json$/i,
  THING: /thing\.json$/i,
  POINTS: /points\.json$/i,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NO_FOLDER_SELECTED: "Please select a folder first",
  NO_DATA_AVAILABLE: "No flashcard data found in this folder. Please try selecting a different folder.",
  AUTHENTICATION_REQUIRED: "You need to be signed in to create a round",
  USER_ID_MISSING: "User ID not found in session",
  ROUND_CREATION_FAILED: "Failed to create new round",
  DATA_FETCH_ERROR: "Error fetching file data",
} as const;

// Loading States
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type LoadingState = typeof LOADING_STATES[keyof typeof LOADING_STATES]; 