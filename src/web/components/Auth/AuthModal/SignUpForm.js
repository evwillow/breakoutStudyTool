/**
 * SignUpForm Component
 * 
 * Features:
 * - Dedicated sign up form logic
 * - Lazy-loaded hCaptcha component
 * - Terms of service integration
 * - Proper accessibility
 */

import React, { Suspense } from 'react';
import Link from 'next/link';
import { UI_TEXT, DATABASE_ERROR_SOLUTIONS } from '../utils/constants';
import FormInput from './FormInput';
import FormButton from './FormButton';
import ErrorDisplay from './ErrorDisplay';

/**
 * SignUpForm component for user registration
 * @param {Object} props - Component props
 * @returns {JSX.Element} Sign up form
 */
const SignUpForm = ({
  formData,
  onInputChange,
  onSubmit,
  isLoading,
  error,
  databaseError,
  captchaToken,
  onCaptchaVerify,
  onCaptchaReset,
  onToggleMode,
  HCaptchaComponent
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormInput
        id="signup-email"
        label={UI_TEXT.EMAIL_LABEL}
        type="email"
        value={formData.email}
        onChange={(value) => onInputChange('email', value)}
        required
        autoComplete="email"
      />

      <FormInput
        id="signup-password"
        label={UI_TEXT.PASSWORD_LABEL}
        type="password"
        value={formData.password}
        onChange={(value) => onInputChange('password', value)}
        required
        autoComplete="new-password"
      />

      {/* Password Requirements Hint */}
      <div className="text-xs text-turquoise-600 mt-1 ml-1">
        <p className="font-medium mb-1">Password must include:</p>
        <ul className="space-y-0.5">
          <li>• At least 8 characters</li>
          <li>• One uppercase letter (A-Z)</li>
          <li>• One lowercase letter (a-z)</li>
          <li>• One number (0-9)</li>
          <li>• One special character (!@#$%^&*)</li>
        </ul>
      </div>

      {/* Terms of Service */}
      <div className="flex flex-col items-center">
        <p className="text-sm text-turquoise-600 mb-2 text-center">
          {UI_TEXT.TERMS_TEXT}{' '}
          <Link 
            href="/terms" 
            className="underline hover:text-turquoise-800 focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded"
          >
            {UI_TEXT.TERMS_LINK}
          </Link>
        </p>
      </div>
      
      {/* hCaptcha component with lazy loading */}
      <div className="flex justify-center">
        <Suspense fallback={<div className="text-sm text-turquoise-600">Loading verification...</div>}>
          <HCaptchaComponent
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY}
            onVerify={onCaptchaVerify}
            onExpire={onCaptchaReset}
            onError={onCaptchaReset}
          />
        </Suspense>
      </div>

      <ErrorDisplay 
        error={error} 
        databaseError={databaseError}
        solutions={DATABASE_ERROR_SOLUTIONS}
      />

      <FormButton
        type="submit"
        disabled={isLoading || !captchaToken}
        isLoading={isLoading}
        className="w-full"
      >
        {UI_TEXT.SIGNUP_BUTTON}
      </FormButton>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-sm text-turquoise-600 hover:text-turquoise-800 focus:outline-none focus:underline"
        >
          {UI_TEXT.SWITCH_TO_SIGNIN}
        </button>
      </div>
    </form>
  );
};

export default SignUpForm; 