/**
 * Loading States Component
 * Handles various loading, error, and empty states for the flashcards application
 */

import React from 'react';

interface DataLoadingProps {
  progress?: number;
  step?: string;
  folder?: string | null;
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

interface StandardLoadingProps {
  title?: string;
  message?: string;
  inline?: boolean;
}

// Standardized loading component - matches DataLoading style
export const StandardLoading: React.FC<StandardLoadingProps> = ({ 
  title = "Loading...",
  message,
  inline = false
}) => {
  const containerClass = inline 
    ? "flex items-center justify-center w-full h-full"
    : "w-full min-h-[calc(100vh-14rem)] flex items-center justify-center p-4";
  
  return (
    <div className={containerClass}>
      <div className="flex flex-col justify-center items-center space-y-6 p-8 bg-black rounded-xl shadow-2xl max-w-md w-full border border-white">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-r-2 border-b-2 border-turquoise-400 border-t-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-turquoise-400 rounded-full"></div>
          </div>
        </div>
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-turquoise-400 to-turquoise-300 bg-clip-text text-transparent">
            {title}
          </h2>
          {message && (
            <p className="text-turquoise-300 text-lg font-medium">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Authentication loading state
export const AuthLoading: React.FC = () => (
  <StandardLoading 
    title="Loading Authentication"
    message="Verifying your session..."
  />
);

// Data loading state with progress
export const DataLoading: React.FC<DataLoadingProps> = ({ progress, step, folder }) => (
  <div className="w-full h-[calc(100vh-14rem)] flex flex-col items-center justify-center bg-black gap-4">
    <div className="animate-spin rounded-full h-14 w-14 border-4 border-turquoise-400 border-t-transparent border-r-turquoise-400 border-b-turquoise-400" />
    {(progress !== undefined || step || folder) && (
      <div className="flex flex-col items-center text-center text-sm text-turquoise-200 gap-1">
        {progress !== undefined && (
          <span className="font-semibold tracking-wide">{`Loading ${Math.round(progress * 100)}%`}</span>
        )}
        {step && <span>{step}</span>}
        {folder && <span className="text-turquoise-300">{folder}</span>}
      </div>
    )}
  </div>
);

// Enhanced error state with specific troubleshooting
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  // Detect specific error types and provide targeted guidance
  const getErrorGuidance = (error: string) => {
    if (error.includes('No flashcard data found')) {
      return {
        title: 'No Flashcard Data Found',
        message: 'The selected folder doesn\'t contain any valid flashcard data.',
        troubleshooting: [
          'Try selecting a different folder from the dropdown',
          'Check if the selected folder contains stock chart data',
          'Ensure JSON files (D.json, M.json) exist in subfolders',
          'Verify the data files are correctly structured'
        ]
      };
    } else if (error.includes('authentication') || error.includes('permission')) {
      return {
        title: 'Authentication Error',
        message: 'Unable to access data.',
        troubleshooting: [
          'Check your authentication status',
          'Verify environment variables are set correctly',
          'Ensure you have proper access permissions',
          'Contact support if the issue persists'
        ]
      };
    } else if (error.includes('network') || error.includes('connection')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to data source.',
        troubleshooting: [
          'Check your internet connection',
          'Refresh the page and try again',
          'Wait a moment and retry - the service may be temporarily unavailable'
        ]
      };
    } else {
      return {
        title: 'Error Loading Data',
        message: error,
        troubleshooting: [
          'Try refreshing the page',
          'Select a different folder',
          'Contact support if the problem continues'
        ]
      };
    }
  };

  const guidance = getErrorGuidance(error);

  return (
    <div className="flex flex-col justify-center items-center h-96 space-y-4 p-8 bg-black rounded-lg shadow-lg max-w-2xl mx-auto border border-white">
      <div className="text-red-500 text-4xl mb-2">⚠️</div>
      <h2 className="text-xl font-semibold text-white">{guidance.title}</h2>
      <p className="text-gray-300 text-center">{guidance.message}</p>
      
      {/* Troubleshooting section */}
      <div className="bg-gray-900 rounded-lg p-4 w-full mt-4">
        <h3 className="text-lg font-medium text-white mb-2">💡 Troubleshooting Steps:</h3>
        <ul className="text-sm text-gray-300 space-y-2">
          {guidance.troubleshooting.map((step, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-400 mr-2 mt-0.5">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="flex gap-3 mt-6">
        <button 
          onClick={onRetry}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

// Export as namespace for easier usage
export const LoadingStates = {
  AuthLoading,
  DataLoading,
  ErrorState,
  StandardLoading,
}; 