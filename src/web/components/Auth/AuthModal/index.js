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

  const { signIn, update } = useAuth();

  // Reset form when mode changes or modal opens
  useEffect(() => {
    if (open) {
      setFormData({ email: '', password: '' });
      setError(null);
      setDatabaseError(false);
      setCaptchaToken(null);
    }
  }, [mode, open]);

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

  if (!open) return null;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null); // Clear error when user starts typing
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

    // Validate form data
    const validation = validateAuthForm(formData, mode, captchaToken);
    if (!validation.isValid) {
      setError(validation.error);
      setIsLoading(false);
      return;
    }

    try {
      if (mode === AUTH_MODES.SIGNUP) {
        await handleSignUp();
      } else {
        await handleSignIn();
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || ERROR_MESSAGES.UNKNOWN_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: formData.email, 
        password: formData.password,
        captchaToken 
      }),
    });
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        handleSignUpError(errorData);
      } else {
        const errorText = await response.text();
        console.error('Signup error response:', errorText);
        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
      }
      return;
    }

    // Auto sign in after successful signup
    const signInResult = await signIn({
      email: formData.email,
      password: formData.password
    });

    if (signInResult.error) {
      throw new Error(ERROR_MESSAGES.SIGNIN_AFTER_SIGNUP_ERROR);
    } else {
      alert(ERROR_MESSAGES.SIGNUP_SUCCESS);
      await update();
      onClose();
    }
  };

  const handleSignUpError = (errorData) => {
    console.log('🐛 Debug errorData:', errorData);
    console.log('🐛 Debug errorData.error:', errorData.error);
    console.log('🐛 Debug typeof errorData.error:', typeof errorData.error);
    
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
    } else if (errorData.details === 'Validation failed' || errorData.message === 'Please check your input and try again.') {
      // Handle password validation errors with clear requirements
      setError(`Password must meet these requirements:
• At least 8 characters long
• At least one uppercase letter (A-Z)
• At least one lowercase letter (a-z)
• At least one number (0-9)
• At least one special character (!@#$%^&*)`);
    } else {
      // Convert error to string if it's not already
      const errorMessage = typeof errorData.error === 'string' 
        ? errorData.error 
        : errorData.message || JSON.stringify(errorData.error) || ERROR_MESSAGES.SIGNUP_FAILED;
      setError(errorMessage);
    }
  };

  const handleSignIn = async () => {
    console.log('🔍 Starting sign in process...');
    console.log('📧 Email:', formData.email);
    console.log('🔑 Password length:', formData.password?.length || 0);
    
    const result = await signIn({
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

  const toggleMode = () => {
    setMode(mode === AUTH_MODES.SIGNIN ? AUTH_MODES.SIGNUP : AUTH_MODES.SIGNIN);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-turquoise-950 bg-opacity-70 z-50 p-4 backdrop-blur-sm">
      <div className="bg-soft-white rounded-xl p-6 sm:p-8 w-full max-w-xs sm:max-w-sm md:max-w-md relative text-turquoise-800 shadow-2xl border border-turquoise-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-turquoise-500 hover:text-turquoise-700 transition-colors focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-turquoise-100 rounded-full mb-2">
            <svg className="w-8 h-8 text-turquoise-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-turquoise-800">
            {mode === AUTH_MODES.SIGNIN ? UI_TEXT.WELCOME_BACK : UI_TEXT.CREATE_ACCOUNT}
          </h2>
          <p className="text-turquoise-600 mt-1">
            {mode === AUTH_MODES.SIGNIN ? UI_TEXT.SIGNIN_SUBTITLE : UI_TEXT.SIGNUP_SUBTITLE}
          </p>
        </div>

        {/* Form */}
        {mode === AUTH_MODES.SIGNIN ? (
          <SignInForm
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
            databaseError={databaseError}
            onToggleMode={toggleMode}
          />
        ) : (
          <SignUpForm
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={error}
            databaseError={databaseError}
            captchaToken={captchaToken}
            onCaptchaVerify={handleCaptchaVerify}
            onCaptchaReset={handleCaptchaReset}
            onToggleMode={toggleMode}
            HCaptchaComponent={HCaptcha}
          />
        )}
      </div>
    </div>
  );
};

export default AuthModal; 