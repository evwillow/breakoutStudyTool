/**
 * @fileoverview Shared authentication schemas and TypeScript types.
 * @module lib/shared/src/types/auth.ts
 * @dependencies zod
 */
import { z } from 'zod';

/**
 * Authentication Types
 * 
 * Centralized type definitions for authentication operations.
 * Includes Zod schemas for runtime validation and TypeScript types.
 */

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  plan: z.enum(['free', 'premium']),
  status: z.enum(['active', 'cancelled', 'expired']),
  startDate: z.date(),
  endDate: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  subscription: SubscriptionSchema.optional(),
});

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User type inferred from Zod schema
 */
export type User = z.infer<typeof UserSchema>;

/**
 * Subscription type inferred from Zod schema
 */
export type Subscription = z.infer<typeof SubscriptionSchema>;

/**
 * Auth response type inferred from Zod schema
 */
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  email: string;
  password: string;
}

/**
 * Authentication user (simplified for client-side use)
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/**
 * Authentication token (JWT)
 */
export interface AuthToken {
  id: string;
  name: string;
  email: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

/**
 * Authentication session
 */
export interface AuthSession {
  user: AuthUser;
  expires: string;
}

/**
 * Signup request
 */
export interface SignupRequest {
  email: string;
  password: string;
  captchaToken?: string;
}

/**
 * Signup response
 */
export interface SignupResponse {
  message: string;
  user: {
    id: string;
    email: string;
    username?: string;
  };
}

/**
 * Database user (internal representation)
 */
export interface DatabaseUser {
  id: string;
  email: string;
  password: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * CAPTCHA verification result
 */
export interface CaptchaVerificationResult {
  success: boolean;
  error?: string;
}

/**
 * Validation result (generic)
 */
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  reason?: string;
  error?: string;
}
