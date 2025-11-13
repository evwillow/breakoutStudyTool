/**
 * @fileoverview Barrel exports for shared authentication configuration, services, and types.
 * @module src/web/lib/auth/index.ts
 * @dependencies ../auth, ./services/authService, ./types, ./constants
 */
/**
 * Authentication Module Index
 * 
 * Centralized exports for the authentication system.
 * Provides clean imports for other parts of the application.
 */

// Main auth configuration
export { authConfig } from "../auth";

// Services
export { authService } from "./services/authService";

// Types
export type {
  AuthCredentials,
  AuthUser,
  AuthToken,
  AuthSession,
  ValidationResult,
  AuthResult,
  DatabaseUser
} from "./types";

// Constants
export { AUTH_CONFIG, AUTH_ERRORS } from "./constants"; 