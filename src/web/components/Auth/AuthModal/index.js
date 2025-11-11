"use client";

/**
 * Optimized AuthModal Component
 * 
 * Features:
 * - Separated sign in and sign up forms
 * - Uses custom hooks for better state management
 * - Centralized constants and validation
 * - Improved accessibility and error handling
 * - Lazy loading of hCaptcha component
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_MODES, UI_TEXT, ERROR_MESSAGES } from '../utils/constants';
import { validateAuthForm } from '../utils/validation';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';

// Lazy load hCaptcha to improve initial bundle size
const HCaptcha = React.lazy(() => import('@hcaptcha/react-hcaptcha'));

// Add database test function
const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing database connection...');
    const response = await fetch('/api/auth/test-db', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    console.log('📊 Database test result:', result);
    return result;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * AuthModal component for user authentication
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @returns {JSX.Element|null} Auth modal or null if closed
 */
const AuthModal = ({ open, onClose, initialMode }) => {
  const [mode, setMode] = useState(initialMode || AUTH_MODES.SIGNIN);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState(null);

  const { signIn: signInWithCredentials, signInWithProvider, update } = useAuth();
  const isGoogleEnabled =
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_ENABLED?.toLowerCase() === 'true') ||
    Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const googleDisabledMessage =
    process.env.NODE_ENV === 'development'
      ? 'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL to enable it.'
      : 'Google sign-in is not available right now. Contact support if you need it enabled.';

  // Reset form and mode when modal opens
  useEffect(() => {
    if (open) {
      // Ensure mode is set correctly when modal opens
      const correctMode = initialMode || AUTH_MODES.SIGNIN;
      setMode(correctMode);
      setFormData({ email: '', password: '' });
      setError(null);
      setDatabaseError(false);
      setCaptchaToken(null);
      setFieldErrors({});
    }
  }, [open, initialMode]);

  // Reset form when mode changes (but modal is already open)
  // This handles mode toggles while the modal is open
  useEffect(() => {
    if (open) {
      // Only reset form if mode actually changed (not on initial mount)
      setFormData({ email: '', password: '' });
      setError(null);
      setDatabaseError(false);
      setCaptchaToken(null);
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Control body scroll when modal opens/closes
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let isActive = true;
    setSystemStatus(null);

    testDatabaseConnection()
      .then((result) => {
        if (!isActive) return;

        if (result?.success) {
          setSystemStatus({
            state: 'ready',
            message: 'You can sign up right away—we’re ready when you are.',
          });
        } else {
          setSystemStatus({
            state: 'monitoring',
            message: 'If anything feels off, reach us on support and we’ll help immediately.',
          });
        }
      })
      .catch(() => {
        if (!isActive) return;
        setSystemStatus({
          state: 'monitoring',
          message: 'If anything feels off, reach us on support and we’ll help immediately.',
        });
      });

    return () => {
      isActive = false;
    };
  }, [open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
    setFieldErrors(prev => {
      if (!prev || !prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleCaptchaVerify = (token) => {
    setCaptchaToken(token);
  };

  const handleCaptchaReset = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setDatabaseError(false);
    setIsLoading(true);
    setFieldErrors({});

    // Capture current mode to prevent race conditions
    const currentMode = mode;
    
    // Validate that mode is valid
    if (currentMode !== AUTH_MODES.SIGNIN && currentMode !== AUTH_MODES.SIGNUP) {
      console.error('Invalid auth mode:', currentMode);
      setError('An error occurred. Please refresh the page and try again.');
      setIsLoading(false);
      return;
    }

    // Validate form data with current mode
    const validation = validateAuthForm(formData, currentMode, captchaToken);
    if (!validation.isValid) {
      setError(validation.error);
      setIsLoading(false);
      return;
    }

    try {
      // Double-check mode before calling handler to prevent confusion
      if (currentMode === AUTH_MODES.SIGNUP) {
        console.log('📝 Submitting signup form');
        await handleSignUp();
      } else if (currentMode === AUTH_MODES.SIGNIN) {
        console.log('🔐 Submitting signin form');
        await handleSignIn();
      } else {
        throw new Error('Invalid authentication mode');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    // Safety check: ensure we're in signup mode
    if (mode !== AUTH_MODES.SIGNUP) {
      console.error('handleSignUp called but mode is:', mode);
      throw new Error('Invalid operation: not in signup mode');
    }

    console.log('🚀 Starting signup request for:', formData.email);
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: formData.email, 
        password: formData.password,
        captchaToken 
      }),
    });
    
    const contentType = response.headers.get('content-type');
    let responseData;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const errorText = await response.text();
      console.error('Signup error response:', errorText);
      setError(ERROR_MESSAGES.SERVER_ERROR);
      return;
    }
    
    // Check if response indicates an error (either !ok or success: false)
    if (!response.ok || !responseData.success) {
      await handleSignUpError(responseData);
      return;
    }

    // Auto sign in after successful signup
    console.log('✅ Signup successful, attempting auto sign-in...');
    const signInResult = await signInWithCredentials({
      email: formData.email,
      password: formData.password
    });

    if (signInResult.error) {
      console.error('❌ Auto sign-in after signup failed:', signInResult.error);
      // Don't throw error - account was created successfully
      // Just show a message that they need to sign in manually
      setError('Account created successfully! Please sign in with your email and password.');
      // Reset form so they can sign in
      setFormData({ email: formData.email, password: '' });
      setMode(AUTH_MODES.SIGNIN);
      setCaptchaToken(null);
    } else {
      console.log('✅ Auto sign-in successful');
      alert(ERROR_MESSAGES.SIGNUP_SUCCESS);
      await update();
      onClose();
    }
  };

  const handleSignUpError = async (errorData) => {
    console.log('🐛 Debug errorData:', errorData);
    console.log('🐛 Debug errorData.error:', errorData.error);
    console.log('🐛 Debug typeof errorData.error:', typeof errorData.error);
    
    setFieldErrors({});

    // Check for validation errors first
    const validationErrors = errorData.error?.validationErrors || errorData.validationErrors;
    if (validationErrors && typeof validationErrors === 'object') {
      // Format validation errors into a readable message
      const errorMessages = Object.entries(validationErrors)
        .map(([field, message]) => {
          // Capitalize field name and format message
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
          return `${fieldName}: ${message}`;
        });
      setFieldErrors(validationErrors);
      
      const emailValidationMessage = validationErrors.email;
      if (emailValidationMessage && emailValidationMessage.includes('already exists')) {
        const autoSignInResult = await signInWithCredentials({
          email: formData.email,
          password: formData.password
        });

        if (autoSignInResult?.error) {
          setError('Looks like you already have an account. Try signing in with this password or reset it if you forgot.');
        } else {
          onClose();
        }
        return;
      }

      if (errorMessages.length > 0) {
        setError(errorMessages.join('\n'));
        return;
      }
    }
    
    if (errorData.error === 'Invalid CAPTCHA') {
      setError(ERROR_MESSAGES.CAPTCHA_FAILED);
      handleCaptchaReset();
    } else if (errorData.error && typeof errorData.error === 'string' && (
      errorData.error.includes('Database') || 
      errorData.error.includes('database') ||
      errorData.isPaused ||
      errorData.tableIssue
    )) {
      setDatabaseError(true);
      setError(errorData.error + (errorData.details ? `: ${errorData.details}` : ''));
    } else if (errorData.error?.code === 4000 || errorData.error?.code === 4002 || errorData.error?.message === 'Please check your input and try again.' || errorData.message === 'Please check your input and try again.') {
      // Handle generic validation errors - check if we have specific validation errors
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        // We already handled validation errors above, but if we get here, show a helpful message
        const errorMessages = Object.entries(validationErrors)
          .map(([field, message]) => {
            const fieldName = field === 'email' ? 'Email' : field === 'password' ? 'Password' : field.charAt(0).toUpperCase() + field.slice(1);
            return `${fieldName}: ${message}`;
          });
        setError(errorMessages.join('\n'));
      } else {
        // Generic validation error without specific field errors
        setError('Please check your input. Email must be valid and your password needs at least 8 characters.');
      }
    } else {
      // Convert error to string if it's not already
      const errorMessage = errorData.error?.message || 
        (typeof errorData.error === 'string' ? errorData.error : null) ||
        errorData.message || 
        ERROR_MESSAGES.SIGNUP_FAILED;
      setError(errorMessage);
    }
  };

  const handleSignIn = async () => {
    // Safety check: ensure we're in signin mode
    if (mode !== AUTH_MODES.SIGNIN) {
      console.error('handleSignIn called but mode is:', mode);
      throw new Error('Invalid operation: not in signin mode');
    }

    console.log('🔍 Starting sign in process...');
    console.log('📧 Email:', formData.email);
    console.log('🔑 Password length:', formData.password?.length || 0);
    
    const result = await signInWithCredentials({
      email: formData.email,
      password: formData.password
    });

    console.log('📊 Sign in result:', result);

    if (result.error) {
      console.log('❌ Sign in failed:', result.error);
      setError(ERROR_MESSAGES.INVALID_CREDENTIALS);
      return;
    } else {
      console.log('✅ Sign in successful');
      await update();
      onClose();
    }
  };

  const handleGoogleSignIn = async () => {
    if (!isGoogleEnabled) {
      setError(
        'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.'
      );
      return;
    }

    setError(null);
    setDatabaseError(false);
    setIsGoogleLoading(true);

    try {
      const callbackUrl =
        typeof window !== 'undefined' && window.location
          ? window.location.href
          : undefined;

      const result = await signInWithProvider('google', {
        callbackUrl,
        redirect: true,
      });

      // With redirect true, NextAuth navigates away, so we shouldn't reach here.
      if (result?.error) {
        console.error('Google sign-in failed:', result.error);
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const toggleMode = () => {
    const newMode = mode === AUTH_MODES.SIGNIN ? AUTH_MODES.SIGNUP : AUTH_MODES.SIGNIN;
    console.log('🔄 Toggling auth mode from', mode, 'to', newMode);
    setMode(newMode);
    // Clear any errors when switching modes
    setError(null);
    setFieldErrors({});
  };

  const isSignup = mode === AUTH_MODES.SIGNUP;
  // Ensure modal is always rendered when open, using portal for proper z-index stacking
  if (!open) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="fixed inset-0 bg-turquoise-950/70 backdrop-blur-sm"></div>
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="relative w-full max-w-2xl">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-turquoise-900/25 via-transparent to-transparent blur-3xl"></div>
          <div className="relative overflow-hidden rounded-3xl border border-turquoise-200/60 bg-soft-white/95 shadow-2xl shadow-turquoise-950/20">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-turquoise-500 transition hover:text-turquoise-400 focus:outline-none focus:ring-2 focus:ring-turquoise-400"
              aria-label="Close modal"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex flex-col gap-6 p-6 sm:p-8">
              <div className="space-y-3 text-center sm:text-left">
                <h2 className="text-2xl font-semibold text-turquoise-800 sm:text-3xl">
                  {isSignup ? UI_TEXT.CREATE_ACCOUNT : UI_TEXT.WELCOME_BACK}
                </h2>
                <p className="text-sm text-turquoise-500/90 sm:text-base">
                  {isSignup ? UI_TEXT.SIGNUP_SUBTITLE : UI_TEXT.SIGNIN_SUBTITLE}
                </p>
                {systemStatus?.message && (
                  <p className="text-xs text-turquoise-400/80 sm:text-sm">{systemStatus.message}</p>
                )}
              </div>

              {isSignup ? (
                <SignUpForm
                  formData={formData}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  error={error}
                  databaseError={databaseError}
                  fieldErrors={fieldErrors}
                  captchaToken={captchaToken}
                  onCaptchaVerify={handleCaptchaVerify}
                  onCaptchaReset={handleCaptchaReset}
                  onToggleMode={toggleMode}
                  onGoogleSignIn={handleGoogleSignIn}
                  isGoogleLoading={isGoogleLoading}
                  isGoogleEnabled={isGoogleEnabled}
                  googleUnavailableMessage={googleDisabledMessage}
                  onTermsClick={onClose}
                  HCaptchaComponent={HCaptcha}
                />
              ) : (
                <SignInForm
                  formData={formData}
                  onInputChange={handleInputChange}
                  onSubmit={handleSubmit}
                  isLoading={isLoading}
                  error={error}
                  databaseError={databaseError}
                  onToggleMode={toggleMode}
                  onGoogleSignIn={handleGoogleSignIn}
                  isGoogleLoading={isGoogleLoading}
                  isGoogleEnabled={isGoogleEnabled}
                  googleUnavailableMessage={googleDisabledMessage}
                />
              )}

              {isSignup && systemStatus?.message && (
                <div className="rounded-2xl border border-turquoise-200/40 bg-turquoise-50/70 p-4 text-xs text-turquoise-600">
                  {systemStatus.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level for proper z-index stacking
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
};

export default AuthModal; 