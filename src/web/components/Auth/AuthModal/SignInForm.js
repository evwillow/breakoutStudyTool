/**
 * SignInForm Component
 * 
 * Features:
 * - Dedicated sign in form logic
 * - Reusable form components
 * - Proper accessibility
 * - Error handling display
 */

import React from 'react';
import { UI_TEXT, DATABASE_ERROR_SOLUTIONS } from '../utils/constants';
import FormInput from './FormInput';
import FormButton from './FormButton';
import ErrorDisplay from './ErrorDisplay';

/**
 * SignInForm component for user sign in
 * @param {Object} props - Component props
 * @returns {JSX.Element} Sign in form
 */
const SignInForm = ({
  formData,
  onInputChange,
  onSubmit,
  isLoading,
  error,
  databaseError,
  onToggleMode
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormInput
        id="signin-email"
        label={UI_TEXT.EMAIL_LABEL}
        type="email"
        value={formData.email}
        onChange={(value) => onInputChange('email', value)}
        required
        autoComplete="email"
      />

      <FormInput
        id="signin-password"
        label={UI_TEXT.PASSWORD_LABEL}
        type="password"
        value={formData.password}
        onChange={(value) => onInputChange('password', value)}
        required
        autoComplete="current-password"
      />

      <ErrorDisplay 
        error={error} 
        databaseError={databaseError}
        solutions={DATABASE_ERROR_SOLUTIONS}
      />

      <FormButton
        type="submit"
        disabled={isLoading}
        isLoading={isLoading}
        className="w-full"
      >
        {UI_TEXT.SIGNIN_BUTTON}
      </FormButton>

      <div className="text-center mt-4">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-sm text-turquoise-400 hover:text-turquoise-300 focus:outline-none focus:underline"
        >
          {UI_TEXT.SWITCH_TO_SIGNUP}
        </button>
      </div>
    </form>
  );
};

export default SignInForm; 