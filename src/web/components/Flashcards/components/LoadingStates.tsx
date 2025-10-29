/**
 * Loading States Component
 * Handles various loading, error, and empty states for the flashcards application
 */

import React from 'react';

interface DataLoadingProps {
  progress: number;
  step: string;
  folder: string | null;
}

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

interface NoDataStateProps {
  onSelectDataset: () => void;
  debugInfo?: {
    flashcardsLength: number;
    hasCurrentFlashcard: boolean;
    orderedFilesLength: number;
    selectedFolder: string | null;
    loading: boolean;
    error: string | null;
  };
}

// Authentication loading state
export const AuthLoading: React.FC = () => (
  <div className="flex justify-center items-center h-screen">
    <p className="text-white">Loading...</p>
  </div>
);

// Data loading state with progress
export const DataLoading: React.FC<DataLoadingProps> = ({ 
  progress, 
  step, 
  folder 
}) => (
  <div className="flex flex-col justify-center items-center h-96 space-y-6 p-8 bg-white rounded-lg shadow-lg max-w-md mx-auto border border-gray-300 mt-20">
    <div className="relative">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-blue-500 font-semibold">{progress}%</span>
      </div>
    </div>
    <div className="text-center space-y-2">
      <h2 className="text-xl font-semibold text-gray-800">Loading Dataset</h2>
      <p className="text-gray-600">{step}</p>
      {folder && (
        <p className="text-sm text-gray-500">Folder: {folder}</p>
      )}
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div 
        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
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
          'Check if the Google Drive folder contains stock chart data',
          'Ensure JSON files (D.json, H.json, M.json) exist in subfolders',
          'Verify Google Drive permissions are correctly configured'
        ]
      };
    } else if (error.includes('authentication') || error.includes('permission')) {
      return {
        title: 'Authentication Error',
        message: 'Unable to access Google Drive data.',
        troubleshooting: [
          'Check Google Drive service account configuration',
          'Verify environment variables are set correctly',
          'Ensure the service account has access to the folder',
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

// Enhanced no data state
export const NoDataState: React.FC<NoDataStateProps> = ({ onSelectDataset, debugInfo }) => {
  // If we have debug info, show only the error details
  if (debugInfo) {
    return (
      <div className="flex flex-col justify-center items-center h-96 space-y-6 p-8 bg-black rounded-lg shadow-lg max-w-2xl mx-auto border border-white">
        <h2 className="text-2xl font-semibold text-white">Error Details</h2>
        
        <div className="bg-red-900 rounded-lg p-6 w-full">
          <div className="text-sm text-red-200 space-y-2">
            <p><strong>Error:</strong> {debugInfo.error || 'No error message available'}</p>
            <p><strong>Flashcards:</strong> {debugInfo.flashcardsLength}</p>
            <p><strong>Current Flashcard:</strong> {debugInfo.hasCurrentFlashcard ? 'Yes' : 'No'}</p>
            <p><strong>Ordered Files:</strong> {debugInfo.orderedFilesLength}</p>
            <p><strong>Selected Folder:</strong> {debugInfo.selectedFolder || 'None'}</p>
            <p><strong>Loading:</strong> {debugInfo.loading ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>
    );
  }

  // Normal no data state when no debug info
  return (
    <div className="flex flex-col justify-center items-center h-96 space-y-6 p-8 bg-black rounded-lg shadow-lg max-w-2xl mx-auto border border-white">
      <div className="text-6xl mb-4">📊</div>
      <h2 className="text-2xl font-semibold text-white">No Data Available</h2>
      <p className="text-gray-300 text-center text-lg">
        Ready to start practicing? Select a dataset to begin your trading education.
      </p>
      
      <div className="bg-gray-900 rounded-lg p-6 w-full">
        <h3 className="text-lg font-medium text-white mb-3">📚 What you'll practice:</h3>
        <ul className="text-gray-300 space-y-2">
          <li className="flex items-center">
            <span className="text-green-400 mr-3">📈</span>
            <span>Identify breakout patterns in real market data</span>
          </li>
          <li className="flex items-center">
            <span className="text-blue-400 mr-3">⏱️</span>
            <span>Make quick decisions under time pressure</span>
          </li>
          <li className="flex items-center">
            <span className="text-yellow-400 mr-3">🎯</span>
            <span>Improve your trading accuracy and speed</span>
          </li>
        </ul>
      </div>
      
      <button 
        onClick={onSelectDataset}
        className="mt-6 px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-lg"
      >
        Select Dataset to Begin
      </button>
    </div>
  );
};

// Export as namespace for easier usage
export const LoadingStates = {
  AuthLoading,
  DataLoading,
  ErrorState,
  NoDataState,
}; 