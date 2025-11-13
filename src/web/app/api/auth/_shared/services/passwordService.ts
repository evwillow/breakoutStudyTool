/**
 * Password Service
 * Handles password validation and hashing operations
 */
import bcrypt from 'bcryptjs';
import type { PasswordValidationResult } from '@breakout-study-tool/shared';

/**
 * Password complexity requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
} as const;

/**
 * Validate password complexity
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return { 
      isValid: false, 
      reason: `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters long` 
    };
  }
  
  return { isValid: true };
}

/**
 * Hash password securely
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12; // Increased from 10 for better security
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
} 