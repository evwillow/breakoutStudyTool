/**
 * @fileoverview Authentication-related TypeScript interfaces for shared use.
 * @module src/web/lib/auth/types.ts
 * @dependencies none
 */
/**
 * Authentication Type Definitions
 * 
 * Centralized type definitions for the authentication system.
 * Provides type safety and consistency across auth-related operations.
 */

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthToken {
  id: string;
  name: string;
  email: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  reason?: string;
  error?: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  password: string;
  created_at?: string;
  updated_at?: string;
} 