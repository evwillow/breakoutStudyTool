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

/**
 * AuthModal component for user authentication
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the modal is open
 * @param {Function} props.onClose - Callback to close the modal
 * @returns {JSX.Element|null} Auth modal or null if closed
 */
const AuthModal = ({ open, onClose }) => {
  const [mode, setMode] = useState(AUTH_MODES.SIGNIN);
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
    if (errorData.error === 'Invalid CAPTCHA') {
      setError(ERROR_MESSAGES.CAPTCHA_FAILED);
      handleCaptchaReset();
    } else if (errorData.error && (
      errorData.error.includes('Database') || 
      errorData.error.includes('database') ||
      errorData.isPaused ||
      errorData.tableIssue
    )) {
      setDatabaseError(true);
      setError(errorData.error + (errorData.details ? `: ${errorData.details}` : ''));
    } else {
      setError(errorData.error || ERROR_MESSAGES.SIGNUP_FAILED);
    }
  };

  const handleSignIn = async () => {
    const result = await signIn({
      email: formData.email,
      password: formData.password
    });

    if (result.error) {
      throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
    } else {
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