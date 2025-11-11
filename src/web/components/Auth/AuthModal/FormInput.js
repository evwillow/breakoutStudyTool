/**
 * FormInput Component
 * 
 * Features:
 * - Consistent styling across forms
 * - Proper accessibility with labels
 * - Controlled input handling
 * - Support for different input types
 */

import React from 'react';

/**
 * FormInput component for consistent form inputs
 * @param {Object} props - Component props
 * @returns {JSX.Element} Form input with label
 */
const FormInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  autoComplete,
  placeholder,
  className = '',
  error
}) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const labelClasses = `block text-sm font-medium mb-1 ${
    error ? 'text-red-200' : 'text-turquoise-400'
  }`;

  const inputClasses = [
    'mt-1 block w-full rounded-md px-3 py-2 shadow-sm transition-colors focus:ring-1',
    error
      ? 'border border-red-400 bg-red-950/30 text-red-200 placeholder-red-300/70 focus:border-red-400 focus:ring-red-400'
      : 'bg-soft-gray-50 border border-turquoise-700/50 text-turquoise-300 placeholder-turquoise-600/50 focus:border-turquoise-500 focus:ring-turquoise-500',
  ].join(' ');

  return (
    <div className={className}>
      <label 
        htmlFor={id} 
        className={labelClasses}
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={handleChange}
        className={inputClasses}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={required ? `${id}-required` : undefined}
        aria-invalid={Boolean(error)}
      />
      {required && (
        <span id={`${id}-required`} className="sr-only">
          This field is required
        </span>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput; 