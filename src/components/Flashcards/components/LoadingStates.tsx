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

// Error state
export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div className="flex flex-col justify-center items-center h-96 space-y-4 p-8 bg-black rounded-lg shadow-lg max-w-md mx-auto border border-white">
    <div className="text-red-500 text-4xl mb-2">⚠️</div>
    <h2 className="text-xl font-semibold text-white">Error Loading Data</h2>
    <p className="text-gray-300 text-center">{error}</p>
    <button 
      onClick={onRetry}
      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Try Again
    </button>
  </div>
);

// No data state
export const NoDataState: React.FC<NoDataStateProps> = ({ onSelectDataset }) => (
  <div className="flex flex-col justify-center items-center h-96 space-y-4 p-8 bg-black rounded-lg shadow-lg max-w-md mx-auto border border-white">
    <h2 className="text-xl font-semibold text-white">No Data Available</h2>
    <p className="text-gray-300 text-center">Please select a dataset to begin practicing.</p>
    <button 
      onClick={onSelectDataset}
      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
    >
      Select Dataset
    </button>
  </div>
);

// Export as namespace for easier usage
export const LoadingStates = {
  AuthLoading,
  DataLoading,
  ErrorState,
  NoDataState,
}; 