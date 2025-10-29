/**
 * Authentication Constants
 * Centralized constants for auth components
 */

export const AUTH_MODES = {
  SIGNIN: 'signin',
  SIGNUP: 'signup'
};

export const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address',
  CAPTCHA_REQUIRED: 'Please complete the CAPTCHA verification',
  CAPTCHA_FAILED: 'CAPTCHA verification failed. Please try again.',
  INVALID_CREDENTIALS: 'Invalid username or password',
  SIGNUP_FAILED: 'Failed to create account',
  SIGNIN_FAILED: 'Sign in failed',
  SIGNUP_SUCCESS: 'Account created successfully! You are now logged in.',
  SIGNIN_AFTER_SIGNUP_ERROR: 'Error signing in after signup.',
  SERVER_ERROR: 'Server returned an invalid response.',
  UNKNOWN_ERROR: 'Unknown error'
};

export const SUCCESS_MESSAGES = {
  ACCOUNT_CREATED: 'Account created successfully! You are now logged in.'
};

export const UI_TEXT = {
  WELCOME_BACK: 'Welcome Back',
  CREATE_ACCOUNT: 'Create Account',
  SIGNIN_SUBTITLE: 'Sign in to continue to the app',
  SIGNUP_SUBTITLE: 'Sign up to get started',
  EMAIL_LABEL: 'Email',
  PASSWORD_LABEL: 'Password',
  SIGNIN_BUTTON: 'Sign In',
  SIGNUP_BUTTON: 'Create Account',
  SWITCH_TO_SIGNUP: "Don't have an account? Sign up",
  SWITCH_TO_SIGNIN: 'Already have an account? Sign in',
  TERMS_TEXT: 'By creating an account, you agree to our',
  TERMS_LINK: 'Terms of Service',
  SIGNOUT_BUTTON: 'Sign Out',
  SIGNIN_SIGNUP_BUTTON: 'Sign In/Sign Up'
};

export const DATABASE_ERROR_SOLUTIONS = [
  'Check if the database connection is working',
  'Verify if the database tables are set up correctly',
  'Try again later or contact support'
];

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 