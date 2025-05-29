/**
 * Authentication Types
 * Centralized type definitions for auth-related operations
 */

export interface SignupRequest {
  email: string;
  password: string;
  captchaToken?: string;
}

export interface SignupResponse {
  message: string;
  user: {
    id: string;
    email: string;
    username?: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  password: string;
  username?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PasswordValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface CaptchaVerificationResult {
  success: boolean;
  error?: string;
} 