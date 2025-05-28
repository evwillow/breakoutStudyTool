/**
 * Authentication Validation Utilities
 * Centralized validation functions for auth forms
 */

import { EMAIL_REGEX, ERROR_MESSAGES } from './constants';

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
export const validateEmail = (email) => {
  return EMAIL_REGEX.test(email);
};

/**
 * Validates form data for authentication
 * @param {Object} formData - Form data to validate
 * @param {string} formData.email - Email address
 * @param {string} formData.password - Password
 * @param {string} mode - Auth mode ('signin' or 'signup')
 * @param {string} captchaToken - Captcha token (required for signup)
 * @returns {Object} - Validation result with isValid and error
 */
export const validateAuthForm = (formData, mode, captchaToken = null) => {
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

  if (mode === 'signup' && !captchaToken) {
    return {
      isValid: false,
      error: ERROR_MESSAGES.CAPTCHA_REQUIRED
    };
  }

  return {
    isValid: true,
    error: null
  };
}; 