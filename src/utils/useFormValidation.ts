import { useState, useCallback, useEffect } from 'react';
import { logger } from './logger';

// Types for form validation
export type ValidationRule = (value: any, allValues?: Record<string, any>) => boolean | string;

export interface FieldConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validate?: ValidationRule | Record<string, ValidationRule>;
  initialValue?: any;
  deps?: string[]; // Fields this field depends on for validation
}

export interface FormConfig {
  [fieldName: string]: FieldConfig;
}

export interface FormErrors {
  [fieldName: string]: string | null;
}

export interface TouchedFields {
  [fieldName: string]: boolean;
}

export interface FormState<T extends Record<string, any>> {
  values: T;
  errors: FormErrors;
  touched: TouchedFields;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
}

/**
 * A custom hook for form validation with detailed error handling
 */
export function useFormValidation<T extends Record<string, any>>(
  config: FormConfig,
  onSubmit?: (values: T) => void | Promise<void>
) {
  // Initialize form values from config
  const initialValues = Object.entries(config).reduce(
    (acc, [fieldName, fieldConfig]) => ({
      ...acc,
      [fieldName]: fieldConfig.initialValue !== undefined ? fieldConfig.initialValue : '',
    }),
    {} as T
  );

  // Form state
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (fieldName: string, value: any, allValues: Record<string, any>): string | null => {
      const fieldConfig = config[fieldName];
      if (!fieldConfig) return null;

      // Required validation
      if (fieldConfig.required && (value === '' || value === null || value === undefined)) {
        return `${fieldName} is required`;
      }

      // Min length validation
      if (fieldConfig.minLength !== undefined && value.length < fieldConfig.minLength) {
        return `${fieldName} must be at least ${fieldConfig.minLength} characters`;
      }

      // Max length validation
      if (fieldConfig.maxLength !== undefined && value.length > fieldConfig.maxLength) {
        return `${fieldName} must be no more than ${fieldConfig.maxLength} characters`;
      }

      // Pattern validation
      if (fieldConfig.pattern && !fieldConfig.pattern.test(value)) {
        return `${fieldName} is not in the correct format`;
      }

      // Custom validation
      if (fieldConfig.validate) {
        if (typeof fieldConfig.validate === 'function') {
          const result = fieldConfig.validate(value, allValues);
          return typeof result === 'string' ? result : result ? null : `${fieldName} is invalid`;
        }

        // Multiple validation rules
        if (typeof fieldConfig.validate === 'object') {
          for (const [ruleName, validateFn] of Object.entries(fieldConfig.validate)) {
            const result = validateFn(value, allValues);
            if (!result || typeof result === 'string') {
              return typeof result === 'string' ? result : `${fieldName} fails ${ruleName} validation`;
            }
          }
        }
      }

      return null;
    },
    [config]
  );

  // Validate all fields
  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    for (const fieldName of Object.keys(config)) {
      const error = validateField(fieldName, values[fieldName as keyof T], values);
      if (error) {
        hasErrors = true;
        newErrors[fieldName] = error;
      } else {
        newErrors[fieldName] = null;
      }
    }

    return newErrors;
  }, [config, validateField, values]);

  // Handle field change
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = event.target;
      const isCheckbox = type === 'checkbox';
      
      // Handle checkboxes correctly
      const newValue = isCheckbox
        ? (event.target as HTMLInputElement).checked
        : value;

      setValues(prev => ({
        ...prev,
        [name]: newValue,
      }));

      setIsDirty(true);
    },
    []
  );

  // Set a field value programmatically
  const setFieldValue = useCallback(
    (fieldName: string, value: any) => {
      setValues(prev => ({
        ...prev,
        [fieldName]: value,
      }));
      setIsDirty(true);
    },
    []
  );

  // Handle field blur (mark as touched)
  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name } = event.target;
      
      setTouched(prev => ({
        ...prev,
        [name]: true,
      }));

      // Validate on blur
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, values[name as keyof T], values),
      }));
    },
    [validateField, values]
  );

  // Mark a field as touched programmatically
  const setFieldTouched = useCallback(
    (fieldName: string, isTouched: boolean = true) => {
      setTouched(prev => ({
        ...prev,
        [fieldName]: isTouched,
      }));

      if (isTouched) {
        // Validate when marking as touched
        setErrors(prev => ({
          ...prev,
          [fieldName]: validateField(fieldName, values[fieldName as keyof T], values),
        }));
      }
    },
    [validateField, values]
  );

  // Reset the form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsDirty(false);
    setIsSubmitting(false);
  }, [initialValues]);

  // Set a field error programmatically
  const setFieldError = useCallback(
    (fieldName: string, error: string | null) => {
      setErrors(prev => ({
        ...prev,
        [fieldName]: error,
      }));
    },
    []
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (event?: React.FormEvent) => {
      if (event) {
        event.preventDefault();
      }

      // Validate all fields
      const newErrors = validateForm();
      setErrors(newErrors);

      // Mark all fields as touched
      const allTouched = Object.keys(config).reduce(
        (acc, field) => ({ ...acc, [field]: true }),
        {} as TouchedFields
      );
      setTouched(allTouched);

      // Check if form is valid
      const hasErrors = Object.values(newErrors).some(error => error !== null);
      
      if (!hasErrors && onSubmit) {
        setIsSubmitting(true);
        
        try {
          await onSubmit(values);
        } catch (error) {
          logger.error('Form submission error', error instanceof Error ? error : new Error(String(error)), {
            formValues: values
          });
          
          // Set a general form error
          setErrors(prev => ({
            ...prev,
            _form: 'Form submission failed. Please try again.',
          }));
        } finally {
          setIsSubmitting(false);
        }
      }
    },
    [config, onSubmit, validateForm, values]
  );

  // Recalculate form validity when values or errors change
  useEffect(() => {
    if (isDirty) {
      const newErrors = validateForm();
      setErrors(prevErrors => {
        // Only update errors for touched fields or when submitting
        const updatedErrors = { ...prevErrors };
        
        for (const [field, error] of Object.entries(newErrors)) {
          if (touched[field] || Object.keys(touched).length === 0) {
            updatedErrors[field] = error;
          }
        }

        return updatedErrors;
      });
    }
  }, [values, validateForm, isDirty, touched]);

  // Check if the form is valid
  const isValid = Object.values(errors).every(error => error === null || error === undefined);

  return {
    values,
    errors,
    touched,
    isDirty,
    isValid,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldTouched,
    setFieldError,
    resetForm,
    // Form state for external consumption
    formState: {
      values,
      errors,
      touched,
      isDirty,
      isValid,
      isSubmitting
    } as FormState<T>
  };
}

export default useFormValidation; 