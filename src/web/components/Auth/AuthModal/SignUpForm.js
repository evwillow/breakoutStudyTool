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
  fieldErrors = {},
  captchaToken,
  onCaptchaVerify,
  onCaptchaReset,
  onToggleMode,
  onGoogleSignIn,
  isGoogleLoading,
  isGoogleEnabled,
  googleUnavailableMessage,
  onTermsClick,
  HCaptchaComponent
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-3">
        <button
          type="button"
          onClick={onGoogleSignIn}
          disabled={isLoading || isGoogleLoading || !isGoogleEnabled}
          className="flex w-full items-center justify-center gap-3 rounded-md border border-turquoise-200/60 bg-white py-2.5 text-sm font-medium text-turquoise-700 shadow-sm transition hover:border-turquoise-400 hover:bg-turquoise-50 focus:outline-none focus:ring-2 focus:ring-turquoise-500 disabled:cursor-not-allowed disabled:opacity-70"
          aria-label={UI_TEXT.GOOGLE_CONTINUE}
          aria-busy={isGoogleLoading}
        >
          {isGoogleLoading ? (
            <svg
              className="h-5 w-5 animate-spin text-turquoise-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.04 12.2611C23.04 11.4455 22.9666 10.661 22.8305 9.909H12V14.3526H18.1844C17.9184 15.7946 17.1255 17.0036 15.9165 17.8042V20.7136H19.5205C21.7556 18.667 23.04 15.7288 23.04 12.2611Z"
              />
              <path
                fill="#34A853"
                d="M12.0002 23.4999C15.12 23.4999 17.7357 22.4689 19.5207 20.7136L15.9167 17.8043C14.9477 18.4523 13.6487 18.8603 12.0002 18.8603C8.99023 18.8603 6.44119 16.7933 5.52819 13.9953H1.80219V17.0043C3.57519 20.7489 7.47323 23.4999 12.0002 23.4999Z"
              />
              <path
                fill="#FBBC04"
                d="M5.5284 13.9954C5.2954 13.3474 5.1634 12.6524 5.1634 11.9404C5.1634 11.2284 5.2954 10.5334 5.5284 9.8854V6.87634H1.8024C0.980403 8.52484 0.500397 10.3824 0.500397 11.9404C0.500397 13.4984 0.980403 15.3559 1.8024 17.0044L5.5284 13.9954Z"
              />
              <path
                fill="#EA4335"
                d="M12.0002 5.12049C13.8432 5.12049 15.4492 5.75549 16.7032 6.94699L19.6102 4.03999C17.7307 2.31099 15.1152 1.38049 12.0002 1.38049C7.47323 1.38049 3.57519 4.13149 1.80219 7.87699L5.52819 10.886C6.44119 8.08799 8.99023 6.02099 12.0002 6.02099V5.12049Z"
              />
            </svg>
          )}
          <span>{UI_TEXT.GOOGLE_CONTINUE}</span>
        </button>
        {!isGoogleEnabled && (
          <p className="text-xs text-turquoise-400/80">
            {googleUnavailableMessage}
          </p>
        )}
        <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-turquoise-400/70">
          <span className="h-px flex-1 bg-turquoise-200/40"></span>
          {UI_TEXT.OR_WITH_EMAIL}
          <span className="h-px flex-1 bg-turquoise-200/40"></span>
        </div>
      </div>

      <FormInput
        id="signup-email"
        label={UI_TEXT.EMAIL_LABEL}
        type="email"
        value={formData.email}
        onChange={(value) => onInputChange('email', value)}
        required
        autoComplete="email"
        error={fieldErrors?.email}
      />

      <FormInput
        id="signup-password"
        label={UI_TEXT.PASSWORD_LABEL}
        type="password"
        value={formData.password}
        onChange={(value) => onInputChange('password', value)}
        required
        autoComplete="new-password"
        error={fieldErrors?.password}
      />

      {/* Terms of Service */}
      <div className="flex flex-col items-center">
        <p className="text-sm text-turquoise-400 mb-2 text-center">
          {UI_TEXT.TERMS_TEXT}{' '}
          <Link 
            href="/terms" 
            className="underline hover:text-turquoise-300 focus:outline-none focus:ring-2 focus:ring-turquoise-500 rounded"
            onClick={onTermsClick}
          >
            {UI_TEXT.TERMS_LINK}
          </Link>
        </p>
      </div>
      
      {/* hCaptcha component with lazy loading */}
      <div className="flex justify-center">
        <Suspense fallback={<div className="text-sm text-turquoise-400">Loading verification...</div>}>
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
          className="text-sm text-turquoise-400 hover:text-turquoise-300 focus:outline-none focus:underline"
        >
          {UI_TEXT.SWITCH_TO_SIGNIN}
        </button>
      </div>
    </form>
  );
};

export default SignUpForm; 