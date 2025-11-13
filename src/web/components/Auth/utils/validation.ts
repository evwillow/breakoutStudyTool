/**
 * @fileoverview Authentication validation helpers for emails, form inputs, and captcha checks.
 * @module src/web/components/Auth/utils/validation.ts
 * @dependencies ./constants
 */
import { EMAIL_REGEX, ERROR_MESSAGES, type AuthMode } from './constants';

export interface FormData {
  email: string;
  password: string;
}

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validates form data for authentication
 */
export const validateAuthForm = (
  formData: FormData,
  mode: AuthMode,
  captchaToken: string | null = null
): ValidationResult => {
  const { email, password } = formData;

  if (!email || !password) {
    return {
      isValid: false,
      error: 'Email and password are required'
    };
  }

  if (!validateEmail(email)) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.INVALID_EMAIL
    };
  }

  if (mode === 'signup') {
    if (password.length < 8) {
      return {
        isValid: false,
        error: 'Password must be at least 8 characters long'
      };
    }
    
    if (!captchaToken) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.CAPTCHA_REQUIRED
      };
    }
  }

  return {
    isValid: true,
    error: null
  };
};

