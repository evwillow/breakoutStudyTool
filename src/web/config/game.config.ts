/**
 * @fileoverview Game rules, scoring, and gameplay configuration constants.
 * @module src/web/config/game.config.ts
 */

/**
 * Timer Configuration
 * Controls countdown timer behavior for flashcard rounds
 */
export const TIMER_CONFIG = {
  /** Initial countdown duration in seconds */
  INITIAL_DURATION: 60,
  /** Update interval for timer display in milliseconds */
  UPDATE_INTERVAL: 1000,
  /** Animation frame threshold for smooth updates */
  ANIMATION_FRAME_THRESHOLD: 1000,
} as const;

/**
 * Game Rules Configuration
 * Defines gameplay mechanics and requirements
 */
export const GAME_CONFIG = {
  /** Action button labels (legacy, not currently used) */
  ACTION_BUTTONS: ["-5%", "0%", "20%", "50%"],
  /** Required files for a valid flashcard */
  REQUIRED_FILES: ["D.json", "M.json"],
  /** Optional files that enhance flashcard experience */
  OPTIONAL_FILES: ["after.json", "points.json"],
  /** Mobile breakpoint width in pixels */
  MOBILE_BREAKPOINT: 1024,
} as const;

/**
 * Scoring Configuration
 * Defines accuracy thresholds and scoring weights
 */
export const SCORING_CONFIG = {
  /** Minimum price accuracy percentage to consider a match "correct" */
  CORRECT_THRESHOLD: 70,
  /** Weight for price accuracy in overall score (0-1) */
  PRICE_WEIGHT: 0.95,
  /** Weight for time accuracy in overall score (0-1) */
  TIME_WEIGHT: 0.05,
} as const;

/**
 * Animation Configuration
 * Controls timing for chart animations and reveals
 */
export const ANIMATION_CONFIG = {
  /** Initial delay before starting animations (ms) */
  INITIAL_DELAY: 1500,
  /** Duration of zoom animation (ms) */
  ZOOM_DURATION: 1500,
  /** Duration of reveal animation (ms) */
  REVEAL_DURATION: 1800,
  /** Delay before showing observation phase (ms) */
  OBSERVATION_DELAY: 5000,
} as const;

/**
 * API Configuration
 * Controls data fetching behavior
 */
export const API_CONFIG = {
  /** Initial number of items to load */
  INITIAL_LOAD_LIMIT: 5,
  /** Number of retry attempts for failed requests */
  RETRY_ATTEMPTS: 3,
  /** Request timeout duration in milliseconds */
  TIMEOUT_DURATION: 30000,
} as const;

/**
 * File Processing Patterns
 * Regex patterns for identifying file types
 */
export const FILE_PATTERNS = {
  /** Pattern for daily chart files */
  DAILY: /D\.json$/i,
  /** Pattern for minute chart files */
  MINUTE: /M\.json$/i,
  /** Pattern for after.json files */
  AFTER: /after\.json$/i,
  /** Pattern for points.json files */
  POINTS: /points\.json$/i,
} as const;

/**
 * Error Messages
 * User-facing error messages for common scenarios
 */
export const ERROR_MESSAGES = {
  NO_FOLDER_SELECTED: "Please select a folder first",
  NO_DATA_AVAILABLE: "No flashcard data found in this folder. Please try selecting a different folder.",
  AUTHENTICATION_REQUIRED: "You need to be signed in to create a round",
  USER_ID_MISSING: "User ID not found in session",
  ROUND_CREATION_FAILED: "Failed to create new round",
  DATA_FETCH_ERROR: "Error fetching file data",
} as const;

/**
 * Loading States
 * Enumeration of possible loading states
 */
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

export type LoadingState = typeof LOADING_STATES[keyof typeof LOADING_STATES];

