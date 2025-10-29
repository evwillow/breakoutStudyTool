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