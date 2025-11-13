/**
 * @fileoverview Authentication string constants and configuration values used in auth UI.
 * @module src/web/components/Auth/utils/constants.ts
 * @dependencies none
 */

export const AUTH_MODES = {
  SIGNIN: 'signin',
  SIGNUP: 'signup'
} as const;

export type AuthMode = typeof AUTH_MODES[keyof typeof AUTH_MODES];

export const ERROR_MESSAGES = {
  INVALID_EMAIL: 'Please enter a valid email address',
  CAPTCHA_REQUIRED: 'Please complete the CAPTCHA verification',
  CAPTCHA_FAILED: 'CAPTCHA verification failed. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password',
  SIGNUP_FAILED: 'Failed to create account',
  SIGNIN_FAILED: 'Sign in failed',
  SIGNUP_SUCCESS: 'Account created successfully! You are now logged in.',
  SIGNIN_AFTER_SIGNUP_ERROR: 'Error signing in after signup.',
  SERVER_ERROR: 'Server returned an invalid response.',
  UNKNOWN_ERROR: 'Unknown error'
} as const;

export const SUCCESS_MESSAGES = {
  ACCOUNT_CREATED: 'Account created successfully! You are now logged in.'
} as const;

export const UI_TEXT = {
  WELCOME_BACK: 'Welcome Back',
  CREATE_ACCOUNT: 'Join Breakout Study',
  SIGNIN_SUBTITLE: 'Jump right back into your personalized drills.',
  SIGNUP_SUBTITLE: 'Create your practice HQ in seconds.',
  EMAIL_LABEL: 'Email',
  PASSWORD_LABEL: 'Password',
  SIGNIN_BUTTON: 'Sign In',
  SIGNUP_BUTTON: 'Create Account',
  SWITCH_TO_SIGNUP: "Don't have an account? Sign up",
  SWITCH_TO_SIGNIN: 'Already have an account? Sign in',
  TERMS_TEXT: 'By creating an account, you agree to our',
  TERMS_LINK: 'Terms of Service',
  SIGNOUT_BUTTON: 'Sign Out',
  SIGNIN_SIGNUP_BUTTON: 'Sign In/Sign Up',
  OR_WITH_EMAIL: 'or continue with email',
  GOOGLE_CONTINUE: 'Continue with Google',
  GOOGLE_SIGNIN: 'Sign in with Google',
  PASSWORD_HELP_TITLE: 'What you unlock',
} as const;

export const DATABASE_ERROR_SOLUTIONS = [
  'Check if the database connection is working',
  'Verify if the database tables are set up correctly',
  'Try again later or contact support'
] as const;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

