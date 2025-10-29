import React, { ReactNode } from 'react';
import { AppError, ErrorCodes } from '@/utils/errorHandling';

// NetworkErrorFallback Component
interface NetworkErrorFallbackProps {
  onRetry?: () => void;
}

export const NetworkErrorFallback: React.FC<NetworkErrorFallbackProps> = ({ onRetry }) => {
  return (
    <div className="p-4 my-4 border rounded-md bg-blue-50 border-blue-100 text-center">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-12 h-12 mx-auto text-blue-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" 
        />
      </svg>
      
      <h3 className="mt-3 text-lg font-medium text-blue-800">Network connection issue</h3>
      <p className="mt-2 text-sm text-blue-700">
        You appear to be offline. Please check your internet connection and try again.
      </p>
      
      <div className="mt-4">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 mr-2 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          Refresh page
        </button>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-blue-700 bg-white rounded border border-blue-300 hover:bg-blue-50"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

// LoadingErrorFallback Component
interface LoadingErrorFallbackProps {
  error?: Error | AppError;
  onRetry?: () => void;
}

export const LoadingErrorFallback: React.FC<LoadingErrorFallbackProps> = ({ error, onRetry }) => {
  return (
    <div className="p-4 my-4 border rounded-md bg-yellow-50 border-yellow-100 text-center">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-12 h-12 mx-auto text-yellow-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7Zm8 10v-3m0-6h.01" 
        />
      </svg>
      
      <h3 className="mt-3 text-lg font-medium text-yellow-800">Data loading error</h3>
      <p className="mt-2 text-sm text-yellow-700">
        {error instanceof AppError 
          ? error.userMessage 
          : "We couldn't load the data you requested. Please try again."}
      </p>
      
      {process.env.NODE_ENV !== 'production' && error && (
        <details className="mt-3 text-left">
          <summary className="text-sm text-yellow-700 cursor-pointer">Error details</summary>
          <div className="p-2 mt-2 text-xs bg-white rounded">
            <p className="font-mono">{error.message}</p>
            {error instanceof AppError && (
              <div className="mt-2">
                <p><strong>Code:</strong> {error.code}</p>
              </div>
            )}
          </div>
        </details>
      )}
      
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 mt-4 text-white bg-yellow-500 rounded hover:bg-yellow-600"
        >
          Try again
        </button>
      )}
    </div>
  );
};

// EmptyStateFallback Component
interface EmptyStateFallbackProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyStateFallback: React.FC<EmptyStateFallbackProps> = ({
  title = 'No data found',
  message = 'There is no data to display at this time.',
  icon,
  action
}) => {
  return (
    <div className="p-8 my-4 border rounded-md bg-gray-50 border-gray-100 text-center">
      {icon || (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="w-12 h-12 mx-auto text-gray-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
          />
        </svg>
      )}
      
      <h3 className="mt-4 text-lg font-medium text-gray-700">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{message}</p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

// AuthErrorFallback Component
interface AuthErrorFallbackProps {
  error?: Error | AppError;
  onRetry?: () => void;
}

export const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({ error, onRetry }) => {
  const handleLogin = () => {
    // Redirect to login page
    window.location.href = '/api/auth/signin';
  };

  return (
    <div className="p-4 my-4 border rounded-md bg-purple-50 border-purple-100 text-center">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-12 h-12 mx-auto text-purple-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
        />
      </svg>
      
      <h3 className="mt-3 text-lg font-medium text-purple-800">Authentication required</h3>
      <p className="mt-2 text-sm text-purple-700">
        {error instanceof AppError 
          ? error.userMessage 
          : "You need to be signed in to access this feature. Please sign in and try again."}
      </p>
      
      <div className="mt-4">
        <button
          onClick={handleLogin}
          className="px-4 py-2 mr-2 text-white bg-purple-500 rounded hover:bg-purple-600"
        >
          Sign in
        </button>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-purple-700 bg-white rounded border border-purple-300 hover:bg-purple-50"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

// Generic Error Fallback Component
interface GenericErrorFallbackProps {
  error?: Error | AppError;
  resetError?: () => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
}

export const GenericErrorFallback: React.FC<GenericErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  message = 'We apologize for the inconvenience. Please try again later.',
  showRetry = true
}) => {
  return (
    <div className="p-4 my-4 border rounded-md bg-red-50 border-red-100 text-center">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-12 h-12 mx-auto text-red-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
        />
      </svg>
      
      <h3 className="mt-3 text-lg font-medium text-red-800">{title}</h3>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      
      {process.env.NODE_ENV !== 'production' && error && (
        <details className="mt-3 text-left">
          <summary className="text-sm text-red-700 cursor-pointer">Error details</summary>
          <div className="p-2 mt-2 text-xs bg-white rounded">
            <p className="font-mono">{error.message}</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
              {error.stack}
            </pre>
            {error instanceof AppError && (
              <div className="mt-2">
                <p><strong>Code:</strong> {error.code}</p>
                <p><strong>User Message:</strong> {error.userMessage}</p>
              </div>
            )}
          </div>
        </details>
      )}
      
      {showRetry && resetError && (
        <button
          onClick={resetError}
          className="px-4 py-2 mt-4 text-white bg-red-500 rounded hover:bg-red-600"
        >
          Try again
        </button>
      )}
    </div>
  );
};

/**
 * Selects the appropriate fallback UI based on error type
 */
export const ErrorFallback: React.FC<{
  error: Error | AppError;
  resetError?: () => void;
}> = ({ error, resetError }) => {
  // Handle network errors
  if (!navigator.onLine || 
      (error instanceof AppError && error.code === ErrorCodes.CLIENT_OFFLINE)) {
    return <NetworkErrorFallback onRetry={resetError} />;
  }
  
  // Handle authentication errors
  if (error instanceof AppError && 
      (error.code === ErrorCodes.AUTH_UNAUTHORIZED || 
       error.code === ErrorCodes.AUTH_EXPIRED_SESSION)) {
    return <AuthErrorFallback error={error} onRetry={resetError} />;
  }
  
  // Handle data loading errors
  if (error instanceof AppError && 
      (error.code === ErrorCodes.API_ERROR || 
       error.code === ErrorCodes.DB_QUERY_ERROR)) {
    return <LoadingErrorFallback error={error} onRetry={resetError} />;
  }
  
  // Default generic error fallback
  return <GenericErrorFallback error={error} resetError={resetError} />;
}; 