/**
 * Flashcard Data Hook
 * Handles data fetching, caching, and folder management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { API_CONFIG, LOADING_STATES, ERROR_MESSAGES, UI_CONFIG } from '../constants';
import { FlashcardData, validateFlashcardData } from '../utils/dataProcessors';
import type { LoadingState } from '../constants';

export interface FolderOption {
  key: string;
  value: string;
  label: string;
}

export interface UseFlashcardDataReturn {
  // Data
  folders: FolderOption[];
  flashcards: FlashcardData[];
  selectedFolder: string | null;
  currentFlashcard: FlashcardData | null;
  
  // Loading states
  loading: boolean;
  loadingProgress: number;
  loadingStep: string;
  error: string | null;
  
  // Actions
  setSelectedFolder: (folder: string | null) => void;
  refetchFolders: () => Promise<void>;
  refetchFlashcards: () => Promise<void>;
  clearError: () => void;
}

export interface UseFlashcardDataOptions {
  currentIndex?: number;
  autoSelectFirstFolder?: boolean;
}

export function useFlashcardData({
  currentIndex = 0,
  autoSelectFirstFolder = true,
}: UseFlashcardDataOptions = {}): UseFlashcardDataReturn {
  const { data: session, status } = useSession();
  
  // Data state
  const [folders, setFolders] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);
  
  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!mountedRef.current) return;
    
    cleanup();
    abortControllerRef.current = new AbortController();
    
    try {
      console.log("Fetching folders...");
      
      const response = await fetch("/api/files/folders", {
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error fetching folders");
      }
      
      const data = await response.json();
      
      if (!mountedRef.current) return;
      
      if (Array.isArray(data.data)) {
        setFolders(data.data);
        
        // Auto-select first folder if none selected
        if (autoSelectFirstFolder && data.data.length > 0 && !selectedFolder) {
          setSelectedFolder(data.data[0].name);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error("Error fetching folders:", error);
      if (mountedRef.current) {
        setError(error.message);
      }
    }
  }, [selectedFolder, autoSelectFirstFolder, cleanup]);
  
  // Fetch flashcards
  const fetchFlashcards = useCallback(async () => {
    if (!selectedFolder || status !== "authenticated" || !session || !mountedRef.current) {
      return;
    }
    
    cleanup();
    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.INITIALIZING);
      setLoadingStep('Initializing...');
      setError(null);
      
      console.log("Starting flashcard fetch for folder:", selectedFolder);
      
      // Fetch with timeout
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, API_CONFIG.TIMEOUT_DURATION);
      
      const response = await fetch(
        `/api/files/data?folder=${encodeURIComponent(selectedFolder)}&limit=${API_CONFIG.INITIAL_LOAD_LIMIT}&offset=0`,
        {
          signal: abortControllerRef.current.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || ERROR_MESSAGES.DATA_FETCH_ERROR);
      }
      
      if (!mountedRef.current) return;
      
      setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.LOADING_FLASHCARDS);
      setLoadingStep('Loading flashcards...');
      
      const data = await response.json();
      
      if (!mountedRef.current) return;
      
      if (Array.isArray(data.data) && data.data.length > 0) {
        // Validate data before setting
        const validFlashcards = data.data.filter(validateFlashcardData);
        
        if (validFlashcards.length === 0) {
          throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
        }
        
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.PROCESSING_DATA);
        setLoadingStep('Processing chart data...');
        
        setFlashcards(validFlashcards);
        
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.FINALIZING);
        setLoadingStep('Finalizing...');
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
      } else {
        throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error("Error fetching flashcards:", error);
      if (mountedRef.current) {
        setError(error.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStep('');
      }
    }
  }, [selectedFolder, status, session, cleanup]);
  
  // Refetch functions
  const refetchFolders = useCallback(async () => {
    await fetchFolders();
  }, [fetchFolders]);
  
  const refetchFlashcards = useCallback(async () => {
    await fetchFlashcards();
  }, [fetchFlashcards]);
  
  // Handle folder selection
  const handleSetSelectedFolder = useCallback((folder: string | null) => {
    setSelectedFolder(folder);
    setFlashcards([]);
    setError(null);
    
    if (folder) {
      // Small delay to allow UI to update
      setTimeout(() => {
        fetchFlashcards();
      }, 100);
    }
  }, [fetchFlashcards]);
  
  // Fetch folders on mount
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);
  
  // Fetch flashcards when folder changes
  useEffect(() => {
    if (selectedFolder) {
      fetchFlashcards();
    }
  }, [selectedFolder, fetchFlashcards]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);
  
  // Computed values
  const folderOptions: FolderOption[] = folders.map(({ id, name }) => ({
    key: id,
    value: name,
    label: name,
  }));
  
  const currentFlashcard = flashcards[currentIndex] || null;
  
  return {
    // Data
    folders: folderOptions,
    flashcards,
    selectedFolder,
    currentFlashcard,
    
    // Loading states
    loading,
    loadingProgress,
    loadingStep,
    error,
    
    // Actions
    setSelectedFolder: handleSetSelectedFolder,
    refetchFolders,
    refetchFlashcards,
    clearError,
  };
} 