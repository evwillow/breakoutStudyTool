/**
 * @fileoverview Shared authentication constants for routes and services.
 * @module src/web/lib/auth/constants.ts
 * @dependencies none
 */
/**
 * Authentication Constants
 * 
 * Centralized configuration constants for the authentication system.
 * Provides consistent values across the application.
 */

export const AUTH_CONFIG = {
  PAGES: {
    SIGN_IN: "/",
    ERROR: "/",
    SIGN_OUT: "/"
  },
  
  SESSION: {
    MAX_AGE: 30 * 24 * 60 * 60, // 30 days in seconds
    UPDATE_AGE: 24 * 60 * 60    // 24 hours in seconds
  },
  
  JWT: {
    MAX_AGE: 30 * 24 * 60 * 60  // 30 days in seconds
  },
  
  VALIDATION: {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MIN_PASSWORD_LENGTH: 8,
    MAX_PASSWORD_LENGTH: 128
  },
  
  RATE_LIMITING: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    BLOCK_DURATION: 30 * 60 * 1000 // 30 minutes
  },
  
  SECURITY: {
    BCRYPT_ROUNDS: 12,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 30 * 60 * 1000 // 30 minutes
  }
} as const;

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Invalid email or password",
  USER_NOT_FOUND: "User not found",
  INVALID_EMAIL_FORMAT: "Invalid email format",
  PASSWORD_TOO_SHORT: "Password must be at least 8 characters",
  PASSWORD_TOO_LONG: "Password must be less than 128 characters",
  MISSING_CREDENTIALS: "Email and password are required",
  ACCOUNT_LOCKED: "Account temporarily locked due to too many failed attempts",
  INTERNAL_ERROR: "An internal error occurred"
} as const; 