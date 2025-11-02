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
  className = ''
}) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-turquoise-400 mb-1"
      >
        {label}
        {required && <span className="text-red-400 ml-1" aria-label="required">*</span>}
      </label>
      <input
        type={type}
        id={id}
        value={value}
        onChange={handleChange}
        className="mt-1 block w-full rounded-md bg-soft-gray-50 border border-turquoise-700/50 text-turquoise-300 placeholder-turquoise-600/50 shadow-sm focus:border-turquoise-500 focus:ring-turquoise-500 focus:ring-1 transition-colors px-3 py-2"
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-describedby={required ? `${id}-required` : undefined}
      />
      {required && (
        <span id={`${id}-required`} className="sr-only">
          This field is required
        </span>
      )}
    </div>
  );
};

export default FormInput; 