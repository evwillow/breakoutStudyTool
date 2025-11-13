/**
 * @fileoverview Custom hook for loading flashcard folders, datasets, and handling fetch lifecycle state.
 * @module src/web/components/Flashcards/hooks/useFlashcardData.ts
 * @dependencies React, next-auth/react, ../constants, ../utils/dataProcessors, @breakout-study-tool/shared
 */
/**
 * @hook useFlashcardData
 * @overview Fetches flashcard folders, loads card data, and exposes loading state for the flashcard study flow.
 * @usage ```ts
 * const { folders, flashcards, loading, error } = useFlashcardData({ autoSelectFirstFolder: true });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { API_CONFIG, LOADING_STATES, ERROR_MESSAGES, UI_CONFIG } from '../constants';
import { FlashcardData, FlashcardFile, validateFlashcardData } from '../utils/dataProcessors';
import type { LoadingState } from '../constants';
import type { 
  FolderOption, 
  UseFlashcardDataReturn, 
  UseFlashcardDataOptions 
} from '@breakout-study-tool/shared';
  
// Re-export for backward compatibility
export type { FolderOption, UseFlashcardDataReturn, UseFlashcardDataOptions };

export function useFlashcardData({
  currentIndex = 0,
  autoSelectFirstFolder = true,
}: UseFlashcardDataOptions = {}): UseFlashcardDataReturn {
  const { data: session, status } = useSession();
  
  // Data state
  /** Available folder options retrieved from the filesystem/API. */
  const [folders, setFolders] = useState<any[]>([]);
  /** Flashcards belonging to the currently selected folder. */
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  /** Currently selected folder key. */
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  // Loading state
  /** Whether folder or card data is being fetched. */
  const [loading, setLoading] = useState(false);
  /** Progress indicator (0-1) used for multi-step loading UI. */
  const [loadingProgress, setLoadingProgress] = useState(0);
  /** Human-readable loading step. */
  const [loadingStep, setLoadingStep] = useState('');
  /** Error message displayed in the UI when loading fails. */
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const foldersDataRef = useRef<any[]>([]);
  
  // Get or create abort controller
  const getAbortController = useCallback(() => {
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current;
  }, []);
  
  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController(); // Create new one for next operation
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
        foldersDataRef.current = data.folders;
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
    
    // Abort any previous fetch operation
    cleanup();
    
    try {
      setLoading(true);
      setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.INITIALIZING);
      setLoadingStep('Preparing dataset...');
      setError(null);
      
      console.log("Starting flashcard fetch for folder:", selectedFolder);
      
      setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.LOADING_FLASHCARDS);
      setLoadingStep('Loading flashcards...');
      
      let foldersPayload = foldersDataRef.current;
      let fetchedFromNetwork = false;

      if (!foldersPayload || foldersPayload.length === 0) {
        const response = await fetch(`/api/files/local-folders`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || ERROR_MESSAGES.DATA_FETCH_ERROR);
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.folders)) {
          throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
        }

        foldersPayload = data.folders;
        foldersDataRef.current = data.folders;
        setFolders(data.folders);
        fetchedFromNetwork = true;
      }

      // Find the selected folder using cached or freshly fetched data
      let selectedFolderData = foldersPayload?.find((folder: any) => folder.name === selectedFolder);

      if (!selectedFolderData || !selectedFolderData.files || selectedFolderData.files.length === 0) {
        // If cached data is missing or outdated, refetch once
        if (!fetchedFromNetwork) {
          const response = await fetch(`/api/files/local-folders`);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || ERROR_MESSAGES.DATA_FETCH_ERROR);
          }

          const freshData = await response.json();

          if (!freshData.success || !Array.isArray(freshData.folders)) {
            throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
          }

          foldersPayload = freshData.folders;
          foldersDataRef.current = freshData.folders;
          setFolders(freshData.folders);

          selectedFolderData = foldersPayload.find((folder: any) => folder.name === selectedFolder);
        }
      }

      if (!selectedFolderData || !selectedFolderData.files || selectedFolderData.files.length === 0) {
        throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
      }
        
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.PROCESSING_DATA);
        setLoadingStep('Optimizing chart data...');
        
        // Load actual JSON data for each file
        // Strategy: Show UI as soon as we have ONE ready flashcard, then load rest in background
        const files = selectedFolderData.files;
        console.log(`Loading ${files.length} files for folder ${selectedFolder}`);
        
        const INITIAL_STOCK_COUNT = 2; // Number of stock folders to fully load before showing UI
        const QUICK_BATCH_FILE_TARGET = 18; // Max files to load during quick bootstrap
        const BACKGROUND_BATCH_SIZE = 50; // Larger batches for faster background loading
        const loadedFiles: any[] = [];
        let uiReady = false;
        let initialShuffleSeed: number | null = null; // Store shuffle seed to maintain consistent order
        
        // Helper function to check if we have ready flashcards and show UI
        const checkAndShowUI = (currentFiles: any[]) => {
          if (uiReady) return; // Already shown UI
          
          // Group files by stock directory
          const tempStockGroups = new Map<string, any[]>();
          currentFiles.forEach(file => {
            if (file) {
              const stockDir = file.fileName.split('/')[0];
              if (!tempStockGroups.has(stockDir)) {
                tempStockGroups.set(stockDir, []);
              }
              tempStockGroups.get(stockDir)!.push(file);
            }
          });
          
          // Check if any flashcard has essential files
          const essentialFiles = new Set(['D.json', 'H.json', 'M.json']);
          const hasReadyFlashcard = Array.from(tempStockGroups.values()).some(files => {
            return files.some((f: any) => {
              const fileName = f.fileName.split('/').pop() || f.fileName;
              return essentialFiles.has(fileName);
            });
          });
          
          if (hasReadyFlashcard && currentFiles.length >= 3) {
            // Only shuffle once when first showing UI - use a seeded random for consistency
            // This prevents the order from changing as more files load
            if (initialShuffleSeed === null) {
              // Generate a seed based on folder name for consistent shuffling
              let seed = 0;
              for (let i = 0; i < selectedFolder.length; i++) {
                seed = ((seed << 5) - seed) + selectedFolder.charCodeAt(i);
                seed = seed & seed; // Convert to 32bit integer
              }
              initialShuffleSeed = Math.abs(seed);
            }
            
            // Seeded random number generator for consistent shuffling
            let seedValue = initialShuffleSeed;
            const seededRandom = () => {
              seedValue = (seedValue * 9301 + 49297) % 233280;
              return seedValue / 233280;
            };
            
            // Shuffle the Map entries BEFORE creating flashcards
            const shuffleArray = <T,>(array: T[]): T[] => {
              const shuffled = [...array];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              return shuffled;
            };
            
            // Convert Map entries to array and shuffle them BEFORE mapping to flashcards
            const stockEntries = Array.from(tempStockGroups.entries());
            const shuffledStockEntries = shuffleArray(stockEntries);
            
            // Create initial flashcard data from shuffled entries
            const flashcardData = shuffledStockEntries.map(([stockDir, files]) => {
              const hasEssentialFile = files.some((f: any) => {
                const fileName = f.fileName.split('/').pop() || f.fileName;
                return essentialFiles.has(fileName);
              });
              
              return {
                id: stockDir,
                name: stockDir,
                folderName: selectedFolder,
                jsonFiles: files,
                isReady: hasEssentialFile
              };
            });
            
            // Shuffle again to ensure complete randomization
            const shuffledFlashcardData = shuffleArray(flashcardData);
            setFlashcards(shuffledFlashcardData);
            setLoading(false);
            setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
            setLoadingStep('');
            uiReady = true;
            console.log(`UI ready after loading ${currentFiles.length} files!`);
          }
        };
        
        // Prioritize files: Essential files (D/M) and points.json together first, then after.json, then date-formatted files
        const essentialFileNames = ['D.json', 'M.json'];
        // Pattern to match date-formatted files like "Feb_22_2016.json"
        const dateFilePattern = /^[A-Za-z]{3}_\d{1,2}_\d{4}\.json$/;
        
        const prioritizedFiles = [
          // First: Essential files (D.json, M.json) and points.json together - load at same time
          ...files.filter((f: { fileName: string }) => {
            const fileName = f.fileName.split('/').pop() || f.fileName;
            const lowerFileName = fileName.toLowerCase();
            return essentialFileNames.includes(fileName) || 
                   (lowerFileName.includes('points') && lowerFileName.endsWith('.json'));
          }),
          // Second: after.json files for the same stocks
          ...files.filter((f: { fileName: string }) => {
            const fileName = f.fileName.toLowerCase();
            return fileName.includes('after') && fileName.endsWith('.json');
          }),
          // Fourth: Date-formatted files (previous breakouts) - important for DateFolderBrowser
          ...files.filter((f: { fileName: string }) => {
            const fileName = f.fileName.split('/').pop() || f.fileName;
            return dateFilePattern.test(fileName);
          }),
          // Then: Everything else
          ...files.filter((f: { fileName: string }) => {
            const fileName = f.fileName.split('/').pop() || f.fileName;
            const lowerFileName = fileName.toLowerCase();
            return !essentialFileNames.includes(fileName) && 
                   !(lowerFileName.includes('after') && lowerFileName.endsWith('.json')) &&
                   !(lowerFileName.includes('points') && lowerFileName.endsWith('.json')) &&
                   !dateFilePattern.test(fileName);
          })
        ];
        
        // Map stock directories to their files for quick access
        const stockFilesMap = new Map<string, any[]>();
        files.forEach((file: any) => {
          const stockDir = file.fileName.split('/')[0];
          if (!stockDir) {
            return;
          }
          if (!stockFilesMap.has(stockDir)) {
            stockFilesMap.set(stockDir, []);
          }
          stockFilesMap.get(stockDir)!.push(file);
        });

        // Determine stock order based on prioritized files to respect initial priority
        const stockOrder: string[] = [];
        prioritizedFiles.forEach((file: any) => {
          const stockDir = file.fileName.split('/')[0];
          if (stockDir && !stockOrder.includes(stockDir)) {
            stockOrder.push(stockDir);
          }
        });

        // Load first quick batch to get UI ready ASAP (now with prioritization)
        // Load enough files to get essential files + after.json + points.json + date-formatted files for a few flashcards
        const quickBatchAdded = new Set<string>();
        const quickBatch: any[] = [];
        const stocksLoaded = new Set<string>();
        const essentialFileNamesLower = new Set(['d.json', 'm.json']);
        const optionalPriorityLower = new Set(['points.json']);
        const afterFileNameLower = 'after.json';

        for (const stockDir of stockOrder) {
          const stockFiles = stockFilesMap.get(stockDir) || [];
          if (stockFiles.length === 0) {
            continue;
          }

          let addedForStock = false;
          const tryAddFile = (file: any) => {
            if (!file) return;
            if (quickBatchAdded.has(file.fileName)) return;
            quickBatch.push(file);
            quickBatchAdded.add(file.fileName);
            addedForStock = true;
          };

          // Essential timeframe files
          stockFiles
            .filter((file: any) => {
              const lastPart = (file.fileName.split('/').pop() || file.fileName).toLowerCase();
              return essentialFileNamesLower.has(lastPart);
            })
            .forEach(tryAddFile);

          // Points file
          const pointsFile = stockFiles.find((file: any) => {
            const lastPart = (file.fileName.split('/').pop() || file.fileName).toLowerCase();
            return optionalPriorityLower.has(lastPart);
          });
          if (pointsFile) {
            tryAddFile(pointsFile);
          }

          // After file
          const afterFile = stockFiles.find((file: any) => {
            const lastPart = (file.fileName.split('/').pop() || file.fileName).toLowerCase();
            return lastPart === afterFileNameLower;
          });
          if (afterFile) {
            tryAddFile(afterFile);
          }

          // Limited set of date-formatted history files
          stockFiles
            .filter((file: any) => {
              const lastPart = file.fileName.split('/').pop() || file.fileName;
              return dateFilePattern.test(lastPart);
            })
            .slice(0, 3)
            .forEach(tryAddFile);

          if (addedForStock) {
            stocksLoaded.add(stockDir);
          }

          if (quickBatch.length >= QUICK_BATCH_FILE_TARGET) {
            break;
          }

          if (stocksLoaded.size >= INITIAL_STOCK_COUNT && quickBatch.length >= 6) {
            break;
          }
        }

        // Fallback: ensure we have at least some files to process
        if (quickBatch.length === 0) {
          const fallbackCount = Math.min(QUICK_BATCH_FILE_TARGET, prioritizedFiles.length);
          for (let i = 0; i < fallbackCount; i++) {
            const file = prioritizedFiles[i];
            if (!quickBatchAdded.has(file.fileName)) {
              quickBatch.push(file);
              quickBatchAdded.add(file.fileName);
            }
          }
        }

        const quickBatchFileNames = new Set(quickBatch.map((file: any) => file.fileName));

        const quickPromises = quickBatch.map(async (file: any) => {
          try {
            const url = `/api/files/local-data?file=${encodeURIComponent(file.fileName)}&folder=${encodeURIComponent(selectedFolder)}`;
            
            const fileResponse = await fetch(url, {
              signal: getAbortController().signal
            });
            
            if (!fileResponse.ok) return null;
            
            const fileData = await fileResponse.json();
            if (!fileData.success) return null;
            
            return {
              fileName: file.fileName,
              data: fileData.data,
              mimeType: file.mimeType,
              size: file.size,
              createdTime: file.createdTime,
              modifiedTime: file.modifiedTime
            };
          } catch {
            return null;
          }
        });
        
        // Wait for quick batch - use allSettled to avoid blocking on errors
        const quickResults = await Promise.allSettled(quickPromises);
        const quickLoaded = quickResults
          .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value !== null)
          .map(result => result.value);
        loadedFiles.push(...quickLoaded);
        
        // Check if we can show UI now
        checkAndShowUI(loadedFiles);
        
        // If still not ready, load more files in parallel (no sequential wait)
        const prioritizedRemainder = prioritizedFiles.filter((file: any) => !quickBatchFileNames.has(file.fileName));

        if (!uiReady && prioritizedRemainder.length > 0) {
          const nextQuickBatch = prioritizedRemainder.slice(0, Math.min(QUICK_BATCH_FILE_TARGET, prioritizedRemainder.length));
          const nextQuickPromises = nextQuickBatch.map(async (file: any) => {
            try {
              const url = `/api/files/local-data?file=${encodeURIComponent(file.fileName)}&folder=${encodeURIComponent(selectedFolder)}`;
              const fileResponse = await fetch(url, { signal: getAbortController().signal });
              if (!fileResponse.ok) return null;
              const fileData = await fileResponse.json();
              if (!fileData.success) return null;
              return {
                fileName: file.fileName,
                data: fileData.data,
                mimeType: file.mimeType,
                size: file.size,
                createdTime: file.createdTime,
                modifiedTime: file.modifiedTime
              };
            } catch {
              return null;
            }
          });
          
          const nextQuickResults = await Promise.allSettled(nextQuickPromises);
          const nextQuickLoaded = nextQuickResults
            .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);
          loadedFiles.push(...nextQuickLoaded);
          checkAndShowUI(loadedFiles);
        }
        
        console.log(`Loaded ${loadedFiles.length} initial files, UI ready: ${uiReady}`);
        
        // Continue loading remaining files in background (non-blocking)
        // Start background loading immediately - no delay
        const loadedFileNameSet = new Set(loadedFiles.map(file => file.fileName));
        const remainingFiles = prioritizedFiles.filter((file: any) => !loadedFileNameSet.has(file.fileName));
        
        if (remainingFiles.length > 0) {
          // Start background loading immediately without any delay
          (async () => {
            for (let i = 0; i < remainingFiles.length; i += BACKGROUND_BATCH_SIZE) {
              const batch = remainingFiles.slice(i, i + BACKGROUND_BATCH_SIZE);
              const batchPromises = batch.map(async (file: any) => {
                try {
                  const url = `/api/files/local-data?file=${encodeURIComponent(file.fileName)}&folder=${encodeURIComponent(selectedFolder)}`;
                  const fileResponse = await fetch(url, { signal: getAbortController().signal });
                  if (!fileResponse.ok) return null;
                  const fileData = await fileResponse.json();
                  if (!fileData.success) return null;
                  return {
                    fileName: file.fileName,
                    data: fileData.data,
                    mimeType: file.mimeType,
                    size: file.size,
                    createdTime: file.createdTime,
                    modifiedTime: file.modifiedTime
                  };
                } catch {
                  return null;
                }
              });
              
              // Use allSettled to avoid blocking on errors
              const batchResults = await Promise.allSettled(batchPromises);
              const batchLoaded = batchResults
                .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled' && result.value !== null)
                .map(result => result.value);
              
              if (batchLoaded.length > 0) {
                loadedFiles.push(...batchLoaded);
                
                // Update flashcards with new files - MERGE instead of rebuild to preserve existing data
                setFlashcards((prevCards: FlashcardData[]) => {
                  const updatedCards = prevCards.map(card => {
                    const stockDir = card.name || card.id;
                    const newFiles = batchLoaded.filter(f => f && f.fileName.startsWith(`${stockDir}/`));
                    
                    if (newFiles.length > 0) {
                      // Merge new files with existing files, avoiding duplicates
                      const existingFileNames = new Set(card.jsonFiles.map(f => f.fileName));
                      const uniqueNewFiles = newFiles.filter(f => !existingFileNames.has(f.fileName));
                      
                      // Check if this card now has essential files
                      const essentialFiles = new Set(['D.json', 'M.json']);
                      const hasEssentialFile = [...card.jsonFiles, ...uniqueNewFiles].some(f => {
                        const fileName = f.fileName.split('/').pop() || f.fileName;
                        return essentialFiles.has(fileName);
                      });
                      
                      return {
                        ...card,
                        jsonFiles: [...card.jsonFiles, ...uniqueNewFiles],
                        isReady: hasEssentialFile
                      };
                    }
                    
                    return card;
                  });
                  
                  // Add any new flashcards for stock directories we haven't seen yet
                  const existingStockDirs = new Set(updatedCards.map(card => card.name || card.id));
                  const stockGroups = new Map<string, any[]>();
                  batchLoaded.forEach(file => {
                    if (file) {
                      const stockDir = file.fileName.split('/')[0];
                      if (!existingStockDirs.has(stockDir)) {
                        if (!stockGroups.has(stockDir)) {
                          stockGroups.set(stockDir, []);
                        }
                        stockGroups.get(stockDir)!.push(file);
                      }
                    }
                  });
                  
                  // Add new flashcards for stock directories we just discovered
                  const essentialFiles = new Set(['D.json', 'M.json']);
                  const newCards = Array.from(stockGroups.entries()).map(([stockDir, files]) => {
                    const hasEssentialFile = files.some((f: any) => {
                      const fileName = f.fileName.split('/').pop() || f.fileName;
                      return essentialFiles.has(fileName);
                    });
                    return {
                      id: stockDir,
                      name: stockDir,
                      folderName: selectedFolder,
                      jsonFiles: files,
                      isReady: hasEssentialFile
                    };
                  });
                  
                  // Insert new cards at random positions in the existing array to maintain visual stability
                  // This prevents the order from jumping around as new cards are discovered
                  const combinedCards = [...updatedCards];
                  newCards.forEach(newCard => {
                    // Insert at a random position in the existing array
                    const randomIndex = Math.floor(Math.random() * (combinedCards.length + 1));
                    combinedCards.splice(randomIndex, 0, newCard);
                  });
                  
                  return combinedCards;
                });
              }
              
              // No delay between batches - load as fast as possible
            }
          })();
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
        // Start with flashcards that have essential files (D.json or M.json) loaded
        const essentialFiles = new Set(['D.json', 'M.json']);
        
        // Shuffle the Map entries BEFORE creating flashcards to ensure random order
        const shuffleArray = <T,>(array: T[]): T[] => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };
        
        // Convert Map entries to array and shuffle them BEFORE mapping to flashcards
        const stockEntries = Array.from(stockGroups.entries());
        const shuffledStockEntries = shuffleArray(stockEntries);
        
        const flashcardData = shuffledStockEntries.map(([stockDir, files]) => {
          // Check if this flashcard has at least one essential file loaded
          const hasEssentialFile = files.some((f: any) => {
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
        
        // Check if we have at least one ready flashcard
        const readyFlashcards = flashcardData.filter(f => f.isReady);
        
        // Shuffle again to ensure complete randomization
        const shuffledFlashcardData = shuffleArray(flashcardData);
        
        console.log("=== FLASHCARD DATA CREATED ===");
        console.log("Number of flashcards:", shuffledFlashcardData.length);
        console.log("Ready flashcards:", readyFlashcards.length);
        console.log("First flashcard:", shuffledFlashcardData[0]);
        console.log("First flashcard files:", shuffledFlashcardData[0]?.jsonFiles?.map(f => f.fileName.split('/').pop()));
        console.log("Total files loaded so far:", loadedFiles.length);
        console.log("=== END FLASHCARD DATA ===");
        
        // Set flashcards immediately with whatever files we have loaded (now shuffled)
        // This allows the game to start while files are still loading in background
        setFlashcards(shuffledFlashcardData);
        
        // If we have at least one ready flashcard, we can stop blocking the UI
        if (readyFlashcards.length > 0) {
          console.log(`Found ${readyFlashcards.length} ready flashcards - allowing UI to render`);
          // Stop blocking the UI - data is ready to use
          setLoading(false);
          setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
          setLoadingStep('');
        }
        
        // Continue loading remaining files in background if needed
        // Get all files that should be loaded according to the folder data
        const loadedFileNames = new Set(validFiles.map(f => f.fileName));
        
        // Find all files from the folder that we haven't loaded yet
        // These will be loaded in the background
        const missingFiles = selectedFolderData.files.filter((file: any) => {
          return !loadedFileNames.has(file.fileName);
        });
        
        // Load remaining files in background without blocking UI
        if (missingFiles.length > 0 || loadedFiles.length < files.length) {
          console.log(`Loading ${missingFiles.length} additional files in background...`);
          // Start background loading immediately - no delay
          loadMissingFilesInBackground(
            missingFiles, 
            selectedFolder, 
            stockGroups,
            (updateFn: any) => {
              setFlashcards((prevCards: FlashcardData[]) => {
                const updated = updateFn(prevCards);
                return updated || prevCards;
              });
            }
          );
        }
        
        // If we didn't have ready flashcards, keep loading state active
        if (readyFlashcards.length === 0) {
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.FINALIZING);
        setLoadingStep('Finalizing dataset...');
        }
    } catch (error: any) {
      console.error("Error fetching flashcards:", error);
      setError(error.message);
      setLoading(false);
      setLoadingProgress(0);
      setLoadingStep('');
    }
    // Note: We don't use finally here because we want to control when loading state changes
    // Loading state is set to false as soon as we have usable data (ready flashcards)
  }, [selectedFolder, status, session, cleanup]);

  // Background file loading function - loads files without blocking UI
  const loadMissingFilesInBackground = useCallback(async (
    missingFiles: any[],
    folder: string,
    stockGroups: Map<string, any[]>,
    updateFlashcards: (updateFn: (prevCards: FlashcardData[]) => FlashcardData[]) => void
  ) => {
    console.log(`Background loading: Starting to load ${missingFiles.length} files...`);
    
    const BATCH_SIZE = 50; // Larger batch size for faster background loading
    
    for (let i = 0; i < missingFiles.length; i += BATCH_SIZE) {
      const batch = missingFiles.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(async (file: any): Promise<FlashcardFile | null> => {
        try {
          const url = `/api/files/local-data?file=${encodeURIComponent(file.fileName)}&folder=${encodeURIComponent(folder)}`;
          const fileResponse = await fetch(url);
          
          if (!fileResponse.ok) {
            return null;
          }
          
          const fileData = await fileResponse.json();
          
          if (!fileData.success) {
            return null;
          }
          
          // Return only the properties that match FlashcardFile interface
          return {
            fileName: file.fileName,
            data: fileData.data
          };
        } catch {
          return null;
        }
      });
      
      // Use allSettled to avoid blocking on errors
      const batchResults = await Promise.allSettled(batchPromises);
      const loadedFiles = batchResults
        .filter((result): result is PromiseFulfilledResult<FlashcardFile | null> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value as FlashcardFile);
      
      if (loadedFiles.length > 0) {
        // Update flashcards with newly loaded files
        updateFlashcards((prevCards: FlashcardData[]): FlashcardData[] => {
          const updatedCards = prevCards.map(card => {
            const stockDir = card.name || card.id;
            const newFiles = loadedFiles.filter(f => f.fileName.startsWith(`${stockDir}/`));
            
            if (newFiles.length > 0) {
              // Merge new files with existing files, avoiding duplicates
              const existingFileNames = new Set(card.jsonFiles.map(f => f.fileName));
              const uniqueNewFiles: FlashcardFile[] = newFiles.filter(f => !existingFileNames.has(f.fileName));
              
              // Check if this card now has essential files
              const essentialFiles = new Set(['D.json', 'H.json', 'M.json']);
              const hasEssentialFile = [...card.jsonFiles, ...uniqueNewFiles].some(f => {
                const fileName = f.fileName.split('/').pop() || f.fileName;
                return essentialFiles.has(fileName);
              });
              
              return {
                ...card,
                jsonFiles: [...card.jsonFiles, ...uniqueNewFiles],
                isReady: hasEssentialFile
              };
            }
            
            return card;
          });
          
          return updatedCards;
        });
      }
      
      // No delay between batches - load as fast as possible
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
      // Start fetching immediately - no delay
      console.log("Calling fetchFlashcards for folder:", folder);
      fetchFlashcards();
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