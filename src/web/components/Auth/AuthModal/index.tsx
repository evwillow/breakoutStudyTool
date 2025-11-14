/**
 * @fileoverview Authentication modal orchestrating sign-in/up forms, captcha, and system status checks.
 * @module src/web/components/Auth/AuthModal/index.tsx
 * @dependencies React, react-dom, ../hooks/useAuth, ../utils/constants, ../utils/validation, ./SignInForm, ./SignUpForm, @hcaptcha/react-hcaptcha
 */
"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { signIn } from 'next-auth/react';
import { useAuth } from '../hooks/useAuth';
import { AUTH_MODES, UI_TEXT, ERROR_MESSAGES, type AuthMode } from '../utils/constants';
import { validateAuthForm, type FormData } from '../utils/validation';
import SignInForm from './SignInForm';
import SignUpForm from './SignUpForm';

// Lazy load hCaptcha to improve initial bundle size
const HCaptcha = React.lazy(() => import('@hcaptcha/react-hcaptcha'));

interface SystemStatus {
  state: 'ready' | 'monitoring';
  message: string;
}

interface DatabaseTestResult {
  success: boolean;
  error?: string;
}

interface SignUpErrorData {
  error?: string | { code?: number; message?: string; validationErrors?: Record<string, string> };
  validationErrors?: Record<string, string>;
  isPaused?: boolean;
  tableIssue?: boolean;
  details?: string;
  message?: string;
  success?: boolean;
}

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

// Add database test function
const testDatabaseConnection = async (): Promise<DatabaseTestResult> => {
  try {
    console.log('🔍 Testing database connection...');
    const response = await fetch('/api/auth/test-db', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json() as DatabaseTestResult;
    console.log('📊 Database test result:', result);
    return result;
  } catch (error) {
    console.error('❌ Database test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
};

/**
 * AuthModal component for user authentication
 */
const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, initialMode }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode || AUTH_MODES.SIGNIN);
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [databaseError, setDatabaseError] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

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
  useEffect(() => {
    if (open) {
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
            message: 'You can sign up right away—we are ready when you are.',
          });
        } else {
          setSystemStatus({
            state: 'monitoring',
            message: 'If anything feels off, reach us on support and we will help immediately.',
          });
        }
      })
      .catch(() => {
        if (!isActive) return;
        setSystemStatus({
          state: 'monitoring',
          message: 'If anything feels off, reach us on support and we will help immediately.',
        });
      });

    return () => {
      isActive = false;
    };
  }, [open]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    setFieldErrors(prev => {
      if (!prev || !prev[field]) return prev;
      const { [field]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaReset = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setDatabaseError(false);
    setIsLoading(true);
    setFieldErrors({});

    const currentMode = mode;
    
    if (currentMode !== AUTH_MODES.SIGNIN && currentMode !== AUTH_MODES.SIGNUP) {
      console.error('Invalid auth mode:', currentMode);
      setError('An error occurred. Please refresh the page and try again.');
      setIsLoading(false);
      return;
    }

    const validation = validateAuthForm(formData, currentMode, captchaToken);
    if (!validation.isValid) {
      setError(validation.error || 'Validation failed');
      setIsLoading(false);
      return;
    }

    try {
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
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.UNKNOWN_ERROR;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
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
    let responseData: SignUpErrorData | { success: boolean };
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json() as SignUpErrorData | { success: boolean };
    } else {
      const errorText = await response.text();
      console.error('Signup error response:', errorText);
      setError(ERROR_MESSAGES.SERVER_ERROR);
      return;
    }
    
    if (!response.ok || !('success' in responseData) || !responseData.success) {
      await handleSignUpError(responseData as SignUpErrorData);
      return;
    }

    console.log('✅ Signup successful, attempting auto sign-in...');
    const signInResult = await signInWithCredentials({
      email: formData.email,
      password: formData.password
    });

    if (signInResult.error) {
      console.error('❌ Auto sign-in after signup failed:', signInResult.error);
      setError('Account created successfully! Please sign in with your email and password.');
      setFormData({ email: formData.email, password: '' });
      setMode(AUTH_MODES.SIGNIN);
      setCaptchaToken(null);
    } else {
      console.log('✅ Auto sign-in successful');
      alert(ERROR_MESSAGES.SIGNUP_SUCCESS);
      await update();
      onClose();
      window.location.href = '/study?tutorial=true';
    }
  };

  const handleSignUpError = async (errorData: SignUpErrorData) => {
    console.log('🐛 Debug errorData:', errorData);
    
    setFieldErrors({});

    const validationErrors = (typeof errorData.error === 'object' && errorData.error?.validationErrors) || errorData.validationErrors;
    if (validationErrors && typeof validationErrors === 'object') {
      const errorMessages = Object.entries(validationErrors)
        .map(([field, message]) => {
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
    
    if (errorData.error === 'Invalid CAPTCHA' || (typeof errorData.error === 'string' && errorData.error === 'Invalid CAPTCHA')) {
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
    } else if ((typeof errorData.error === 'object' && (errorData.error?.code === 4000 || errorData.error?.code === 4002)) || 
               (typeof errorData.error === 'object' && errorData.error?.message === 'Please check your input and try again.') ||
               errorData.message === 'Please check your input and try again.') {
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        const errorMessages = Object.entries(validationErrors)
          .map(([field, message]) => {
            const fieldName = field === 'email' ? 'Email' : field === 'password' ? 'Password' : field.charAt(0).toUpperCase() + field.slice(1);
            return `${fieldName}: ${message}`;
          });
        setError(errorMessages.join('\n'));
      } else {
        setError('Please check your input. Email must be valid and your password needs at least 8 characters.');
      }
    } else {
      const errorMessage = (typeof errorData.error === 'object' && errorData.error?.message) || 
        (typeof errorData.error === 'string' ? errorData.error : null) ||
        errorData.message || 
        ERROR_MESSAGES.SIGNUP_FAILED;
      setError(errorMessage);
    }
  };

  const handleSignIn = async () => {
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

  const handleGoogleSignIn = () => {
    if (!isGoogleEnabled) {
      setError(
        'Google sign-in is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable it.'
      );
      return;
    }

    setError(null);
    setDatabaseError(false);
    // Set loading optimistically - redirect happens immediately so this won't be visible
    setIsGoogleLoading(true);

    // Get callback URL immediately
    const callbackUrl =
      typeof window !== 'undefined' && window.location
        ? window.location.href
        : undefined;

    // Call signIn directly from next-auth/react - it will redirect immediately
    // No await needed - the redirect happens synchronously
    signIn('google', {
      callbackUrl,
      redirect: true,
    });
    // Note: If redirect succeeds, we never reach here. If it fails, the page won't redirect
    // and we can handle errors, but typically redirect: true always redirects.
  };

  const toggleMode = () => {
    const newMode = mode === AUTH_MODES.SIGNIN ? AUTH_MODES.SIGNUP : AUTH_MODES.SIGNIN;
    console.log('🔄 Toggling auth mode from', mode, 'to', newMode);
    setMode(newMode);
    setError(null);
    setFieldErrors({});
  };

  const isSignup = mode === AUTH_MODES.SIGNUP;
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

  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  
  return null;
};

export default AuthModal;

