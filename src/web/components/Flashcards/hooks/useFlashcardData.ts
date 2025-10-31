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
    console.log("=== FETCH FOLDERS CALLED ===");
    
    try {
      console.log("Fetching folders from API...");
      
      const response = await fetch("/api/files/local-folders");
      
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(errorData.message || "Error fetching folders");
      }
      
      const data = await response.json();
      console.log("API response data:", data);
      console.log("Data success:", data.success);
      console.log("Data folders:", data.folders);
      console.log("Is folders array:", Array.isArray(data.folders));
      
      if (data.success && Array.isArray(data.folders)) {
        console.log("=== FOLDER DATA RECEIVED ===");
        console.log("Number of folders:", data.folders.length);
        console.log("First folder:", data.folders[0]);
        console.log("Current selectedFolder:", selectedFolder);
        console.log("autoSelectFirstFolder:", autoSelectFirstFolder);
        
        console.log("Setting folders state...");
        setFolders(data.folders);
        console.log("Folders state set");
        
        // Auto-select first folder if none selected
        if (autoSelectFirstFolder && data.folders.length > 0 && !selectedFolder) {
          console.log("Auto-selecting first folder:", data.folders[0].name);
          console.log("Setting selectedFolder to:", data.folders[0].name);
          setSelectedFolder(data.folders[0].name);
          console.log("Selected folder set");
        } else {
          console.log("Not auto-selecting folder. Reasons:");
          console.log("- autoSelectFirstFolder:", autoSelectFirstFolder);
          console.log("- folders.length > 0:", data.folders.length > 0);
          console.log("- !selectedFolder:", !selectedFolder);
        }
        console.log("=== END FOLDER DATA ===");
      } else {
        console.log("Invalid folder data received:", data);
        setError("Invalid folder data received from API");
      }
    } catch (error: any) {
      console.error("Error fetching folders:", error);
      setError(error.message);
    }
  }, [autoSelectFirstFolder]);
  
  // Fetch flashcards
  const fetchFlashcards = useCallback(async () => {
    console.log("=== FETCH FLASHCARDS CALLED ===");
    console.log("selectedFolder:", selectedFolder);
    console.log("status:", status);
    console.log("session:", !!session);
    
    if (!selectedFolder || status !== "authenticated" || !session) {
      console.log("Early return from fetchFlashcards");
      return;
    }
    
    try {
      setLoading(true);
      setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.INITIALIZING);
      setLoadingStep('Initializing...');
      setError(null);
      
      console.log("Starting flashcard fetch for folder:", selectedFolder);
      
      // Get all stock breakouts for the selected date
      const response = await fetch(`/api/files/local-folders`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || ERROR_MESSAGES.DATA_FETCH_ERROR);
      }
      
      setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.LOADING_FLASHCARDS);
      setLoadingStep('Loading flashcards...');
      
      const data = await response.json();
      
      if (data.success && data.folders && Array.isArray(data.folders)) {
        // Find the selected folder
        const selectedFolderData = data.folders.find((folder: any) => folder.name === selectedFolder);
        
        if (!selectedFolderData || !selectedFolderData.files || selectedFolderData.files.length === 0) {
          throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
        }
        
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.PROCESSING_DATA);
        setLoadingStep('Processing chart data...');
        
        // Load actual JSON data for each file
        // Batch requests to avoid overwhelming the server with too many simultaneous requests
        const files = selectedFolderData.files;
        console.log(`Loading ${files.length} files for folder ${selectedFolder}`);
        
        const BATCH_SIZE = 10; // Load 10 files at a time
        const loadedFiles: any[] = [];
        
        // Process files in batches
        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          const batch = files.slice(i, i + BATCH_SIZE);
          const batchPromises = batch.map(async (file: any, batchIndex: number) => {
            try {
              const url = `/api/files/local-data?file=${encodeURIComponent(file.fileName)}&folder=${encodeURIComponent(selectedFolder)}`;
              console.log(`Loading file ${i + batchIndex + 1}/${files.length}: ${file.fileName}`);
              
              const fileResponse = await fetch(url, {
                signal: abortControllerRef.current?.signal
              });
              
              if (!fileResponse.ok) {
                const errorText = await fileResponse.text();
                let errorData;
                try {
                  errorData = JSON.parse(errorText);
                } catch {
                  errorData = { message: errorText };
                }
                console.error(`Failed to load file ${file.fileName}:`, {
                  status: fileResponse.status,
                  statusText: fileResponse.statusText,
                  error: errorData
                });
                return null;
              }
              
              const fileData = await fileResponse.json();
              
              if (!fileData.success) {
                console.error(`Error loading file ${file.fileName}:`, fileData.message || fileData.error);
                return null;
              }
              
              return {
                fileName: file.fileName,
                data: fileData.data,
                mimeType: file.mimeType,
                size: file.size,
                createdTime: file.createdTime,
                modifiedTime: file.modifiedTime
              };
            } catch (error: any) {
              if (error.name === 'AbortError') {
                console.log(`File fetch aborted: ${file.fileName}`);
                return null;
              }
              console.error(`Error loading file ${file.fileName}:`, {
                error: error.message || String(error),
                stack: error.stack,
                name: error.name
              });
              return null;
            }
          });
          
          // Wait for current batch to complete
          const batchResults = await Promise.all(batchPromises);
          loadedFiles.push(...batchResults.filter(Boolean));
          
          // Update progress
          const progress = Math.min(95, Math.round((loadedFiles.length / files.length) * 90));
          setLoadingProgress(progress);
          setLoadingStep(`Loading files... ${loadedFiles.length}/${files.length}`);
          
          // Small delay between batches to avoid overwhelming the server
          if (i + BATCH_SIZE < files.length) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
        const validFiles = loadedFiles.filter(Boolean);
        
        if (validFiles.length === 0) {
          throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
        }
        
        // For "quality_breakouts" folder, group files by stock directory
        // Each stock directory becomes its own flashcard
        const stockGroups = new Map<string, any[]>();
        
        validFiles.forEach(file => {
          if (file) {
            // Extract stock directory from fileName (e.g., "AAL_Dec_11_2006/after.json" -> "AAL_Dec_11_2006")
            const stockDir = file.fileName.split('/')[0];
            if (!stockGroups.has(stockDir)) {
              stockGroups.set(stockDir, []);
            }
            stockGroups.get(stockDir)!.push(file);
          }
        });
        
        // Convert to flashcard format - each stock directory becomes a flashcard
        // Start with flashcards that have essential files (D.json, H.json, or M.json) loaded
        const essentialFiles = new Set(['D.json', 'H.json', 'M.json']);
        
        const flashcardData = Array.from(stockGroups.entries()).map(([stockDir, files]) => {
          // Check if this flashcard has at least one essential file loaded
          const hasEssentialFile = files.some(f => {
            const fileName = f.fileName.split('/').pop() || f.fileName;
            return essentialFiles.has(fileName);
          });
          
          return {
            id: stockDir,
            name: stockDir, // e.g., "AAL_Dec_11_2006"
            folderName: selectedFolder, // Will be "quality_breakouts"
            jsonFiles: files,
            isReady: hasEssentialFile // Flag to indicate if essential files are loaded
          };
        });
        
        console.log("=== FLASHCARD DATA CREATED ===");
        console.log("Number of flashcards:", flashcardData.length);
        console.log("Ready flashcards:", flashcardData.filter(f => f.isReady).length);
        console.log("First flashcard:", flashcardData[0]);
        console.log("First flashcard files:", flashcardData[0]?.jsonFiles);
        console.log("=== END FLASHCARD DATA ===");
        
        // Set flashcards immediately with whatever files we have loaded
        // This allows the game to start while files are still loading in background
        setFlashcards(flashcardData);
        
        // Continue loading remaining files in background if needed
        // Get all files that should be loaded according to the folder data
        const loadedFileNames = new Set(validFiles.map(f => f.fileName));
        
        // Find all files from the folder that we haven't loaded yet
        // These will be loaded in the background
        const missingFiles = selectedFolderData.files.filter((file: any) => {
          return !loadedFileNames.has(file.fileName);
        });
        
        if (missingFiles.length > 0) {
          console.log(`Loading ${missingFiles.length} additional files in background...`);
          // Load remaining files in background without blocking
          // This allows the game to start immediately while files continue loading
          setTimeout(() => {
            loadMissingFilesInBackground(
              missingFiles, 
              selectedFolder, 
              stockGroups,
              (cards: FlashcardData[]) => setFlashcards(cards)
            );
          }, 100);
        }
        
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.FINALIZING);
        setLoadingStep('Finalizing...');
        
        // Small delay to show completion
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
      } else {
        throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
      }
    } catch (error: any) {
      console.error("Error fetching flashcards:", error);
      setError(error.message);
    } finally {
      // Don't set loading to false immediately if we're still loading files in background
      // Only set to false if we're not loading background files
      setLoading(false);
      setLoadingProgress(0);
      setLoadingStep('');
    }
  }, [selectedFolder, status, session, cleanup]);

  // Background file loading function - loads files without blocking UI
  const loadMissingFilesInBackground = useCallback(async (
    missingFiles: any[],
    folder: string,
    stockGroups: Map<string, any[]>,
    updateFlashcards: (cards: FlashcardData[]) => void
  ) => {
    console.log(`Background loading: Starting to load ${missingFiles.length} files...`);
    
    const BATCH_SIZE = 5; // Smaller batch size for background loading
    
    for (let i = 0; i < missingFiles.length; i += BATCH_SIZE) {
      const batch = missingFiles.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (file: any) => {
        try {
          const url = `/api/files/local-data?file=${encodeURIComponent(file.fileName)}&folder=${encodeURIComponent(folder)}`;
          const fileResponse = await fetch(url);
          
          if (!fileResponse.ok) {
            console.warn(`Background load failed for ${file.fileName}`);
            return null;
          }
          
          const fileData = await fileResponse.json();
          
          if (!fileData.success) {
            console.warn(`Background load error for ${file.fileName}:`, fileData.message);
            return null;
          }
          
          return {
            fileName: file.fileName,
            data: fileData.data,
            mimeType: file.mimeType,
            size: file.size,
            createdTime: file.createdTime,
            modifiedTime: file.modifiedTime
          };
        } catch (error: any) {
          console.warn(`Background load exception for ${file.fileName}:`, error.message);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      const loadedFiles = batchResults.filter(Boolean);
      
      if (loadedFiles.length > 0) {
        // Update flashcards with newly loaded files
        updateFlashcards(prevCards => {
          const updatedCards = prevCards.map(card => {
            const stockDir = card.name || card.id;
            const newFiles = loadedFiles.filter(f => f.fileName.startsWith(`${stockDir}/`));
            
            if (newFiles.length > 0) {
              // Merge new files with existing files, avoiding duplicates
              const existingFileNames = new Set(card.jsonFiles.map(f => f.fileName));
              const uniqueNewFiles = newFiles.filter(f => !existingFileNames.has(f.fileName));
              
              return {
                ...card,
                jsonFiles: [...card.jsonFiles, ...uniqueNewFiles]
              };
            }
            
            return card;
          });
          
          return updatedCards;
        });
        
        console.log(`Background loading: Added ${loadedFiles.length} files`);
      }
      
      // Small delay between batches
      if (i + BATCH_SIZE < missingFiles.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Background loading: Complete`);
  }, []);
  
  // Refetch functions
  const refetchFolders = useCallback(async () => {
    await fetchFolders();
  }, [fetchFolders]);
  
  const refetchFlashcards = useCallback(async () => {
    await fetchFlashcards();
  }, [fetchFlashcards]);
  
  // Handle folder selection
  const handleSetSelectedFolder = useCallback((folder: string | null) => {
    console.log("=== HANDLE SET SELECTED FOLDER ===");
    console.log("Setting folder to:", folder);
    setSelectedFolder(folder);
    setFlashcards([]);
    setError(null);
    
    if (folder) {
      // Small delay to allow UI to update
      setTimeout(() => {
        console.log("Calling fetchFlashcards for folder:", folder);
        fetchFlashcards();
      }, 100);
    }
    console.log("=== END HANDLE SET SELECTED FOLDER ===");
  }, [fetchFlashcards]);
  
  // Fetch folders on mount
  useEffect(() => {
    console.log("=== MOUNT EFFECT - CALLING FETCH FOLDERS ===");
    fetchFolders();
  }, [fetchFolders]);
  
  // Track selectedFolder changes
  useEffect(() => {
    console.log("=== SELECTED FOLDER CHANGED ===");
    console.log("New selectedFolder:", selectedFolder);
    console.log("Type:", typeof selectedFolder);
    console.log("=== END SELECTED FOLDER CHANGED ===");
  }, [selectedFolder]);

  // Track folders changes
  useEffect(() => {
    console.log("=== FOLDERS CHANGED ===");
    console.log("New folders:", folders);
    console.log("Folders length:", folders.length);
    console.log("=== END FOLDERS CHANGED ===");
  }, [folders]);

  // Track error changes
  useEffect(() => {
    console.log("=== ERROR CHANGED ===");
    console.log("New error:", error);
    console.log("=== END ERROR CHANGED ===");
  }, [error]);
  
  // Fetch flashcards when folder changes
  useEffect(() => {
    if (selectedFolder) {
      console.log("Selected folder changed, calling fetchFlashcards");
      fetchFlashcards();
    }
  }, [selectedFolder]);
  
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