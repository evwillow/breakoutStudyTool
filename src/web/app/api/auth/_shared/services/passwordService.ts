/**
 * Password Service
 * Handles password validation and hashing operations
 */
import bcrypt from 'bcryptjs';
import { PasswordValidationResult } from '../types/auth';

/**
 * Password complexity requirements
 */
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
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
  
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return { 
      isValid: false, 
      reason: "Password must contain at least one uppercase letter" 
    };
  }
  
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return { 
      isValid: false, 
      reason: "Password must contain at least one lowercase letter" 
    };
  }
  
  if (PASSWORD_REQUIREMENTS.requireNumbers && !/[0-9]/.test(password)) {
    return { 
      isValid: false, 
      reason: "Password must contain at least one number" 
    };
  }
  
  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    return { 
      isValid: false, 
      reason: "Password must contain at least one special character" 
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