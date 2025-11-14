"use client";

import { useCallback, useEffect, useRef } from "react";
import type { FlashcardData, FlashcardFile } from "../utils/dataProcessors";
import { ERROR_MESSAGES, UI_CONFIG } from "../constants";
import type {
  BackgroundUpdateFn,
  DataLoaderParams,
  FlashcardFolderRecord,
  FlashcardFolderFile
} from "./types";

type LoadedFlashcardFile = FlashcardFolderFile & { data?: unknown };

const essentialFileNamesSet = new Set(["D.json", "M.json"]);

const toFlashcardFiles = (files: Array<LoadedFlashcardFile | null>) =>
  files.filter((file): file is LoadedFlashcardFile => Boolean(file));

export const useDataLoader = ({
  autoSelectFirstFolder,
  selectedFolder,
  status,
  session,
  updateFolders,
  setSelectedFolder,
  setFlashcards,
  loadingActions
}: DataLoaderParams) => {
  const { setLoading, setLoadingProgress, setLoadingStep, setError, clearError } =
    loadingActions;

  const abortControllerRef = useRef<AbortController | null>(null);
  const foldersCacheRef = useRef<FlashcardFolderRecord[]>([]);
  const selectedFolderRef = useRef<string | null>(selectedFolder);
  const isFetchingRef = useRef<boolean>(false);
  const lastFetchedFolderRef = useRef<string | null>(null);
  const isBackgroundLoadingRef = useRef<boolean>(false);
  const backgroundLoadingFolderRef = useRef<string | null>(null);
  // Track if flashcards have been shuffled for the current folder to prevent re-shuffling
  // IMPORTANT: Always initialize to null on EVERY component mount to ensure shuffle happens
  // This ref is intentionally NOT persistent across component remounts
  const hasShuffledForFolderRef = useRef<string | null>(null);
  // Track if this is the first fetch ever (to force shuffle on initial page load)
  const isFirstFetchRef = useRef<boolean>(true);

  // Reset shuffle tracking on mount to ensure fresh shuffle on page load
  useEffect(() => {
    hasShuffledForFolderRef.current = null;
    isFirstFetchRef.current = true;
    if (process.env.NODE_ENV === 'development') {
      console.log('[useDataLoader] Component mounted, reset shuffle tracking to force shuffle on next load');
    }
  }, []); // Empty deps = runs only on mount

  // Keep ref in sync with selectedFolder
  useEffect(() => {
    selectedFolderRef.current = selectedFolder;
    // CRITICAL: Reset shuffle tracking when folder changes to ensure shuffle happens
    hasShuffledForFolderRef.current = null;
    if (process.env.NODE_ENV === 'development') {
      console.log('[useDataLoader] Selected folder changed, reset shuffle tracking', { selectedFolder });
    }
  }, [selectedFolder]);

  const getAbortController = useCallback(() => {
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current;
  }, []);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useDataLoader] Cleaning up abort controller');
      }
      abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const fetchFolders = useCallback(async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useDataLoader] fetchFolders: Starting folder fetch');
      }
      // HTTP cache headers are set on the API route for fast loads
      const response = await fetch("/api/files/local-folders", {
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || "Error fetching folders";
        if (process.env.NODE_ENV === 'development') {
          console.error('[useDataLoader] fetchFolders: API error', {
            status: response.status,
            statusText: response.statusText,
            errorMessage,
          });
        }
        throw new Error(errorMessage);
      }

      let data;
      try {
        const responseText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] fetchFolders: Raw response text:', responseText.substring(0, 500));
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[useDataLoader] fetchFolders: Failed to parse response', {
          parseError,
          status: response.status,
          statusText: response.statusText,
        });
        throw new Error('Failed to parse API response');
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[useDataLoader] fetchFolders: Parsed API response', {
          success: data.success,
          hasData: !!data.data,
          dataKeys: data.data ? Object.keys(data.data) : [],
          foldersCount: Array.isArray(data.data?.folders) ? data.data.folders.length : Array.isArray(data.folders) ? data.folders.length : 0,
          fullData: data,
        });
      }

      // Handle both response formats: { success: true, data: { folders, totalFiles } } and { success: true, folders }
      const folders = data.data?.folders ?? data.folders;
      const totalFiles = data.data?.totalFiles ?? data.totalFiles;

      if (data.success && Array.isArray(folders)) {
        foldersCacheRef.current = folders;
        updateFolders(folders);

        if (autoSelectFirstFolder && folders.length > 0) {
          // Use ref to check current selectedFolder to avoid dependency issues
          if (!selectedFolderRef.current) {
            const firstFolderName = folders[0].name;
            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] fetchFolders: Auto-selecting first folder', {
                folderName: firstFolderName,
                currentSelectedFolder: selectedFolderRef.current,
              });
            }
            setSelectedFolder(firstFolderName);
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] fetchFolders: Folder already selected, skipping auto-select', {
                currentSelectedFolder: selectedFolderRef.current,
              });
            }
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] fetchFolders: Not auto-selecting', {
              autoSelectFirstFolder,
              foldersLength: folders.length,
            });
          }
        }
      } else {
        const errorMessage = "Invalid folder data received from API";
        if (process.env.NODE_ENV === 'development') {
          console.error('[useDataLoader] fetchFolders: Invalid data structure', {
            success: data.success,
            isArray: Array.isArray(data.folders),
            data,
          });
        }
        setError(errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ERROR_MESSAGES.DATA_FETCH_ERROR;
      if (process.env.NODE_ENV === 'development') {
        console.error('[useDataLoader] fetchFolders: Exception', {
          error: errorMessage,
          errorObject: error,
        });
      }
      setError(errorMessage);
    }
  }, [autoSelectFirstFolder, updateFolders, setError, setSelectedFolder]);

  const loadMissingFilesInBackground = useCallback(
    async (
      missingFiles: FlashcardFolderFile[],
      folderName: string,
      updateFlashcards: BackgroundUpdateFn
    ) => {
      // Prevent multiple background loads for the same folder
      if (isBackgroundLoadingRef.current && backgroundLoadingFolderRef.current === folderName) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Skipping background load - already loading for this folder');
        }
        return;
      }

      // Prevent background loading if we're already fetching the same folder
      // Note: This is called after main fetch completes, so we check if a new fetch started
      if (isFetchingRef.current && lastFetchedFolderRef.current === folderName) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Skipping background load - fetch in progress for same folder');
        }
        return;
      }

      // Safety check: ensure we have files to load
      if (!missingFiles || missingFiles.length === 0) {
        return;
      }

      // Mark background loading as in progress
      isBackgroundLoadingRef.current = true;
      backgroundLoadingFolderRef.current = folderName;

      const BATCH_SIZE = 50;

      for (let i = 0; i < missingFiles.length; i += BATCH_SIZE) {
        const batch = missingFiles.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(async (file): Promise<FlashcardFile | null> => {
          try {
            const url = `/api/files/local-data?file=${encodeURIComponent(
              file.fileName
            )}&folder=${encodeURIComponent(folderName)}`;
            const fileResponse = await fetch(url);

            if (!fileResponse.ok) return null;

            const fileData = await fileResponse.json();
            if (!fileData.success) return null;

            // The API returns { success: true, data: { data: jsonData, fileName, folder } }
            // Check if data.data exists (nested structure) or if data is the actual data (flat structure)
            let actualData = null;
            
            // First, try the nested structure (the expected format)
            if (fileData.data && typeof fileData.data === 'object' && 'data' in fileData.data) {
              actualData = fileData.data.data;
            } 
            // If that doesn't work, check if data itself is the array (fallback for different API formats)
            else if (fileData.data && Array.isArray(fileData.data)) {
              actualData = fileData.data;
            }
            // If data is an object but not the wrapper, it might be the actual data
            else if (fileData.data && typeof fileData.data === 'object' && !fileData.data.fileName && !fileData.data.folder) {
              actualData = fileData.data;
            }
            
            if (actualData === null || actualData === undefined) {
              console.warn(`File ${file.fileName} has no data in response`);
              return null;
            }

            return {
              fileName: file.fileName,
              data: actualData
            };
          } catch {
            return null;
          }
        });

        const batchResults = await Promise.allSettled(batchPromises);
        const loadedFiles = batchResults
          .filter(
            (result): result is PromiseFulfilledResult<FlashcardFile | null> =>
              result.status === "fulfilled" && result.value !== null
          )
          .map(result => result.value as FlashcardFile);

        if (loadedFiles.length > 0) {
          updateFlashcards((prevCards: FlashcardData[]): FlashcardData[] => {
            const updatedCards = prevCards.map(card => {
              const stockDir = card.name || card.id;
              const newFiles = loadedFiles.filter(f => f.fileName.startsWith(`${stockDir}/`));

              if (newFiles.length > 0) {
                const existingFileNames = new Set(card.jsonFiles.map(f => f.fileName));
                const uniqueNewFiles = newFiles.filter(f => !existingFileNames.has(f.fileName));

                const hasEssentialFile = [...card.jsonFiles, ...uniqueNewFiles].some(f => {
                  const fileName = f.fileName.split("/").pop() || f.fileName;
                  return essentialFileNamesSet.has(fileName);
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
      }

      // Reset background loading flag when done
      isBackgroundLoadingRef.current = false;
      backgroundLoadingFolderRef.current = null;
    },
    []
  );

  const fetchFlashcards = useCallback(
    async (targetFolder?: string) => {
      const folderName = targetFolder ?? selectedFolder;

      if (process.env.NODE_ENV === 'development') {
        console.log('[useDataLoader] fetchFlashcards called', {
          targetFolder,
          selectedFolder,
          folderName,
          hasFolderName: !!folderName,
          isFetching: isFetchingRef.current,
          lastFetched: lastFetchedFolderRef.current,
        });
      }

      if (!folderName) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useDataLoader] No folder name provided, aborting flashcard fetch');
        }
        return;
      }

      // Prevent multiple simultaneous fetches for the same folder
      if (isFetchingRef.current && lastFetchedFolderRef.current === folderName) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[useDataLoader] Already fetching this folder, skipping duplicate call');
        }
        return;
      }

      // Reset shuffle tracking when folder changes
      // Do this BEFORE setting lastFetchedFolderRef to ensure we detect folder changes
      const isNewFolder = lastFetchedFolderRef.current !== folderName;
      if (isNewFolder) {
        hasShuffledForFolderRef.current = null;
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] New folder detected, resetting shuffle tracking', {
            previousFolder: lastFetchedFolderRef.current,
            newFolder: folderName,
          });
        }
      }
      
      // CRITICAL: ALWAYS shuffle on first load - reset the flag to force shuffle
      // This ensures random order on every page load/refresh, regardless of ref state
      const isFirstPageLoad = isFirstFetchRef.current;
      if (isFirstPageLoad) {
        hasShuffledForFolderRef.current = null; // Force shuffle on first page load
        isFirstFetchRef.current = false;
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] First page load detected, forcing shuffle', { 
            folderName,
            wasFirstFetch: isFirstPageLoad,
            resetShuffleFlag: true,
          });
        }
      }
      
      // ALWAYS reset shuffle flag if it's null (first time loading this folder)
      if (hasShuffledForFolderRef.current === null) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Shuffle flag is null, will shuffle', { folderName });
        }
      }

      isFetchingRef.current = true;
      // Store the previous folder before updating to check if we need to shuffle
      const previousFolder = lastFetchedFolderRef.current;
      lastFetchedFolderRef.current = folderName;
      cleanup();

      // Set a timeout fallback to ensure loading doesn't get stuck
      let loadingTimeout: NodeJS.Timeout | null = setTimeout(() => {
        console.warn('Loading timeout reached, forcing loading to false');
        setLoading(false);
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
        setLoadingStep("");
        isFetchingRef.current = false; // Reset fetching flag on timeout
        loadingTimeout = null;
      }, 30000); // 30 second timeout

      try {
        setLoading(true);
        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.INITIALIZING);
        setLoadingStep("Preparing dataset...");
        clearError();

        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.LOADING_FLASHCARDS);
        setLoadingStep("Loading flashcards...");

        let foldersPayload = foldersCacheRef.current;
        let fetchedFromNetwork = false;

        if (!foldersPayload || foldersPayload.length === 0) {
          // HTTP cache headers are set on the API route for fast loads
          const response = await fetch(`/api/files/local-folders`, {
            credentials: 'include'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || ERROR_MESSAGES.DATA_FETCH_ERROR);
          }

          const data = await response.json();

          if (!data.success || !Array.isArray(data.folders)) {
            throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
          }

          foldersPayload = data.folders;
          foldersCacheRef.current = data.folders;
          updateFolders(data.folders);
          fetchedFromNetwork = true;
        }

        let selectedFolderData = foldersPayload?.find(
          (folder: FlashcardFolderRecord) => folder.name === folderName
        );

        if (!selectedFolderData || !selectedFolderData.files || selectedFolderData.files.length === 0) {
          if (!fetchedFromNetwork) {
            // Use cache: 'force-cache' for faster loads
            const response = await fetch(`/api/files/local-folders`, {
              cache: 'force-cache',
              next: { revalidate: 300 } // Revalidate every 5 minutes
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || ERROR_MESSAGES.DATA_FETCH_ERROR);
            }

            const freshData = await response.json();

            if (!freshData.success || !Array.isArray(freshData.folders)) {
              throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
            }

            foldersPayload = freshData.folders;
            foldersCacheRef.current = freshData.folders;
            updateFolders(freshData.folders);

            selectedFolderData = foldersPayload.find(
              (folder: FlashcardFolderRecord) => folder.name === folderName
            );
          }
        }

        if (!selectedFolderData || !selectedFolderData.files || selectedFolderData.files.length === 0) {
          throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
        }

        setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.PROCESSING_DATA);
        setLoadingStep("Optimizing chart data...");

        const files = selectedFolderData.files as FlashcardFolderFile[];
        const INITIAL_STOCK_COUNT = 3; // Reduced from 5 for even faster initial load
        const QUICK_BATCH_FILE_TARGET = 10; // Reduced from 25 - just enough for 3 stocks
        const BACKGROUND_BATCH_SIZE = 150; // Increased from 100 for faster background loading

        const loadedFiles: LoadedFlashcardFile[] = [];
        let uiReady = false;
        // Store previousFolder in a variable accessible to nested functions
        const currentPreviousFolder = previousFolder;

        // Use truly random shuffle - Math.random() for unpredictable order each load
        // This ensures stocks are in different order every time you load the folder
        const shuffleArray = <T,>(array: T[]): T[] => {
          if (array.length <= 1) return array;
          
          const shuffled = [...array];
          
          // Fisher-Yates shuffle
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }

          // CRITICAL: ALWAYS ensure the first element is different (if array has more than 1 element)
          // This guarantees the first stock changes on every shuffle
          if (array.length > 1) {
            let attempts = 0;
            const maxAttempts = 10;
            
            // Keep shuffling until first element changes, or force swap after max attempts
            while (array[0] === shuffled[0] && attempts < maxAttempts) {
              // Try another random shuffle of just the first few elements
              const swapIndex = Math.floor(Math.random() * Math.min(shuffled.length, 10)) + 1;
              [shuffled[0], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[0]];
              attempts++;
            }
            
            // If still the same after attempts, force swap with a guaranteed different element
            if (array[0] === shuffled[0] && shuffled.length > 1) {
              // Find first element that's different from original first
              const differentIndex = shuffled.findIndex((item, idx) => idx > 0 && item !== array[0]);
              if (differentIndex > 0) {
                [shuffled[0], shuffled[differentIndex]] = [shuffled[differentIndex], shuffled[0]];
              } else {
                // Last resort: swap with last element
                [shuffled[0], shuffled[shuffled.length - 1]] = [shuffled[shuffled.length - 1], shuffled[0]];
              }
              
              if (process.env.NODE_ENV === 'development') {
                console.warn('[useDataLoader] First element unchanged after shuffle, forcing swap', {
                  originalFirst: array[0],
                  newFirst: shuffled[0],
                  attempts,
                });
              }
            }
          }

          // Verify shuffle actually changed the order
          const orderChanged = array.length > 1 && (
            array[0] !== shuffled[0] || 
            array[array.length - 1] !== shuffled[shuffled.length - 1]
          );

          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] Shuffled array', {
              originalFirst: array[0],
              shuffledFirst: shuffled[0],
              originalLast: array[array.length - 1],
              shuffledLast: shuffled[shuffled.length - 1],
              length: shuffled.length,
              orderChanged,
              originalOrder: array.slice(0, 5).map(([dir]) => dir),
              shuffledOrder: shuffled.slice(0, 5).map(([dir]) => dir),
            });
          }

          if (!orderChanged && array.length > 1) {
            console.error('[useDataLoader] ERROR: Shuffle did not change order!', {
              arrayLength: array.length,
              firstThree: array.slice(0, 3).map(([dir]) => dir),
            });
          }

          return shuffled;
        };

        const checkAndShowUI = (currentFiles: LoadedFlashcardFile[]) => {
          if (uiReady) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] checkAndShowUI: UI already ready, skipping');
            }
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] checkAndShowUI called', {
              currentFilesCount: currentFiles.length,
              currentFiles: currentFiles.map(f => ({ fileName: f?.fileName, hasData: !!f?.data })),
            });
          }

          const tempStockGroups = new Map<string, LoadedFlashcardFile[]>();
          currentFiles.forEach(file => {
            if (file) {
              const stockDir = file.fileName.split("/")[0];
              if (!tempStockGroups.has(stockDir)) {
                tempStockGroups.set(stockDir, []);
              }
              tempStockGroups.get(stockDir)!.push(file);
            }
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] checkAndShowUI: Stock groups', {
              stockGroupsCount: tempStockGroups.size,
              stockGroups: Array.from(tempStockGroups.entries()).map(([dir, files]) => ({
                dir,
                fileCount: files.length,
                fileNames: files.map(f => f.fileName),
              })),
            });
          }

          const essentialFiles = new Set(["D.json", "M.json"]);
          const hasReadyFlashcard = Array.from(tempStockGroups.values()).some(stockFiles =>
            stockFiles.some(f => {
              const fileName = f.fileName.split("/").pop() || f.fileName;
              return essentialFiles.has(fileName);
            })
          );

          // Show UI if we have at least one ready flashcard, or if we have any files at all
          // This prevents the UI from being stuck in loading when we have data but fewer than 3 files
          if (hasReadyFlashcard && currentFiles.length >= 1) {
            // Use the shared shuffleArray function created at the top of fetchFlashcards
            // Always shuffle on first load for a folder - check if this is a new folder
            const stockEntries = Array.from(tempStockGroups.entries());

            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] Shuffle decision (checkAndShowUI)', {
                folderName,
                hasShuffledForFolder: hasShuffledForFolderRef.current,
                stockEntriesLength: stockEntries.length,
                condition1: hasShuffledForFolderRef.current !== folderName,
                condition2: hasShuffledForFolderRef.current === null,
              });
            }

            // ALWAYS shuffle on first load - force it regardless of ref state
            // This ensures random order on every page load/refresh
            // Shuffle if: folder changed, never shuffled for this folder, or this is the first fetch ever
            const shouldShuffle = stockEntries.length > 0 && (
              hasShuffledForFolderRef.current !== folderName ||
              hasShuffledForFolderRef.current === null
            );
            let shuffledStockEntries: typeof stockEntries;
            
            // CRITICAL: Always shuffle on first load, no matter what
            if (shouldShuffle && stockEntries.length > 0) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[useDataLoader] BEFORE SHUFFLE (checkAndShowUI)', {
                  folderName,
                  stockCount: stockEntries.length,
                  firstThree: stockEntries.slice(0, 3).map(([dir]) => dir),
                  hasShuffledForFolder: hasShuffledForFolderRef.current,
                });
              }
              
              shuffledStockEntries = shuffleArray(stockEntries);
              
              // Mark as shuffled immediately to prevent re-shuffling
              hasShuffledForFolderRef.current = folderName;
              
              if (process.env.NODE_ENV === 'development') {
                console.log('[useDataLoader] AFTER SHUFFLE (checkAndShowUI)', {
                  folderName,
                  stockCount: shuffledStockEntries.length,
                  firstThree: shuffledStockEntries.slice(0, 3).map(([dir]) => dir),
                  changed: stockEntries[0]?.[0] !== shuffledStockEntries[0]?.[0],
                });
              }
            } else {
              shuffledStockEntries = stockEntries; // Don't re-shuffle if already shuffled for this folder
              if (process.env.NODE_ENV === 'development') {
                console.warn('[useDataLoader] SKIPPING SHUFFLE (checkAndShowUI path)', {
                  folderName,
                  hasShuffledForFolder: hasShuffledForFolderRef.current,
                  shouldShuffle,
                  firstStock: stockEntries[0]?.[0],
                });
              }
            }
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] Shuffling stocks (checkAndShowUI)', {
                folderName,
                previousFolder: currentPreviousFolder,
                hasShuffledForFolder: hasShuffledForFolderRef.current,
                shouldShuffle,
                stockCount: stockEntries.length,
                firstStockBefore: stockEntries[0]?.[0],
                firstStockAfter: shuffledStockEntries[0]?.[0],
                entriesBefore: stockEntries.slice(0, 3).map(([dir]) => dir),
                entriesAfter: shuffledStockEntries.slice(0, 3).map(([dir]) => dir),
              });
            }

            const flashcardData = shuffledStockEntries.map(([stockDir, stockFiles]) => {
              const hasEssentialFile = stockFiles.some(f => {
                const fileName = f.fileName.split("/").pop() || f.fileName;
                return essentialFiles.has(fileName);
              });

              // Debug logging
              if (process.env.NODE_ENV === 'development') {
                console.log(`[useDataLoader] Creating flashcard for ${stockDir}`, {
                  stockFilesCount: stockFiles.length,
                  fileNames: stockFiles.map(f => f.fileName),
                  hasEssentialFile,
                  filesWithData: stockFiles.filter(f => f.data !== null && f.data !== undefined).length,
                });
              }

              return {
                id: stockDir,
                name: stockDir,
                folderName,
                jsonFiles: Array.isArray(stockFiles) ? stockFiles : [],
                isReady: hasEssentialFile
              };
            });

            // flashcardData is already shuffled via shuffledStockEntries
            // NO need to shuffle again - this was causing re-ordering

            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] Setting flashcards', {
                flashcardCount: flashcardData.length,
                readyCount: flashcardData.filter(f => f.isReady).length,
                firstFlashcard: flashcardData[0] ? {
                  id: flashcardData[0].id,
                  name: flashcardData[0].name,
                  jsonFilesCount: flashcardData[0].jsonFiles?.length,
                  jsonFileNames: flashcardData[0].jsonFiles?.map(f => f.fileName),
                  hasData: flashcardData[0].jsonFiles?.some(f => f.data !== null && f.data !== undefined),
                } : null,
              });
            }

            setFlashcards(flashcardData);
            // Note: shuffle flag is already set above if we shuffled
            setLoading(false);
            setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
            setLoadingStep("");
            uiReady = true;
          }
        };

        const essentialNames = new Set(["D.json", "M.json"]);
        const dateFilePattern = /^[A-Za-z]{3}_\d{1,2}_\d{4}\.json$/;

        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Files available', {
            totalFiles: files.length,
            fileNames: files.slice(0, 10).map(f => f.fileName),
          });
        }

        const prioritizedFiles = [
          ...files.filter(file => {
            const fileName = file.fileName.split("/").pop() || file.fileName;
            const lowerFileName = fileName.toLowerCase();
            return essentialNames.has(fileName) ||
              (lowerFileName.includes("points") && lowerFileName.endsWith(".json"));
          }),
          ...files.filter(file => {
            const fileName = file.fileName.toLowerCase();
            return fileName.includes("after") && fileName.endsWith(".json");
          }),
          ...files.filter(file => {
            const fileName = file.fileName.split("/").pop() || file.fileName;
            return dateFilePattern.test(fileName);
          }),
          ...files.filter(file => {
            const fileName = file.fileName.split("/").pop() || file.fileName;
            const lowerFileName = fileName.toLowerCase();
            return (
              !essentialNames.has(fileName) &&
              !(lowerFileName.includes("after") && lowerFileName.endsWith(".json")) &&
              !(lowerFileName.includes("points") && lowerFileName.endsWith(".json")) &&
              !dateFilePattern.test(fileName)
            );
          })
        ];

        const stockFilesMap = new Map<string, FlashcardFolderFile[]>();
        files.forEach(file => {
          const stockDir = file.fileName.split("/")[0];
          if (!stockDir) return;
          if (!stockFilesMap.has(stockDir)) {
            stockFilesMap.set(stockDir, []);
          }
          stockFilesMap.get(stockDir)!.push(file);
        });

        const stockOrder: string[] = [];
        prioritizedFiles.forEach(file => {
          const stockDir = file.fileName.split("/")[0];
          if (stockDir && !stockOrder.includes(stockDir)) {
            stockOrder.push(stockDir);
          }
        });

        // CRITICAL: Shuffle stockOrder so initial batch is random from whole dataset
        // This ensures we don't always load AA stocks alphabetically
        if (stockOrder.length > 1) {
          for (let i = stockOrder.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [stockOrder[i], stockOrder[j]] = [stockOrder[j], stockOrder[i]];
          }

          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] Shuffled stock order for initial batch:', {
              totalStocks: stockOrder.length,
              first10: stockOrder.slice(0, 10),
            });
          }
        }

        // CRITICAL: Re-order prioritizedFiles to match the shuffled stockOrder
        // This ensures background loading also loads stocks in shuffled order
        const reorderedPrioritizedFiles: FlashcardFolderFile[] = [];
        for (const stockDir of stockOrder) {
          const filesForStock = prioritizedFiles.filter(
            file => file.fileName.startsWith(`${stockDir}/`)
          );
          reorderedPrioritizedFiles.push(...filesForStock);
        }
        // Use reordered files if available, otherwise use original
        const finalPrioritizedFiles = reorderedPrioritizedFiles.length > 0
          ? reorderedPrioritizedFiles
          : prioritizedFiles;

        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Reordered prioritizedFiles to match shuffled stock order:', {
            originalFirst5Stocks: prioritizedFiles.slice(0, 5).map(f => f.fileName.split('/')[0]),
            reorderedFirst5Stocks: finalPrioritizedFiles.slice(0, 5).map(f => f.fileName.split('/')[0]),
            totalFiles: finalPrioritizedFiles.length,
          });
        }

        const quickBatchAdded = new Set<string>();
        const quickBatch: FlashcardFolderFile[] = [];
        const stocksLoaded = new Set<string>();
        const essentialFileNamesLower = new Set(["d.json", "m.json"]);
        const optionalPriorityLower = new Set(["points.json"]);
        const afterFileNameLower = "after.json";

        for (const stockDir of stockOrder) {
          const stockFiles = stockFilesMap.get(stockDir) || [];
          if (stockFiles.length === 0) continue;

          let addedForStock = false;
          const tryAddFile = (file: FlashcardFolderFile | undefined) => {
            if (!file) return;
            if (quickBatchAdded.has(file.fileName)) return;
            quickBatch.push(file);
            quickBatchAdded.add(file.fileName);
            addedForStock = true;
          };

          // ONLY load essential files (D.json, M.json) for initial batch
          // This makes the initial load MUCH faster
          stockFiles
            .filter(file => {
              const lastPart = (file.fileName.split("/").pop() || file.fileName).toLowerCase();
              return essentialFileNamesLower.has(lastPart);
            })
            .forEach(tryAddFile);

          // Skip points, after, and date files for initial load - they'll be loaded in background
          // This reduces initial load from ~6 files per stock to ~2 files per stock

          if (addedForStock) {
            stocksLoaded.add(stockDir);
          }

          if (quickBatch.length >= QUICK_BATCH_FILE_TARGET) break;
          if (stocksLoaded.size >= INITIAL_STOCK_COUNT) break; // Simplified condition
        }

        if (quickBatch.length === 0) {
          const fallbackCount = Math.min(QUICK_BATCH_FILE_TARGET, finalPrioritizedFiles.length);
          for (let i = 0; i < fallbackCount; i++) {
            const file = finalPrioritizedFiles[i];
            if (!quickBatchAdded.has(file.fileName)) {
              quickBatch.push(file);
              quickBatchAdded.add(file.fileName);
            }
          }
        }

        const quickBatchFileNames = new Set(quickBatch.map(file => file.fileName));

        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Starting quick batch fetch', {
            quickBatchSize: quickBatch.length,
            quickBatchFiles: quickBatch.map(f => f.fileName),
            folderName,
          });
        }

        // Fetch all files in parallel for maximum speed
        const quickPromises = quickBatch.map(async file => {
          try {
            const url = `/api/files/local-data?file=${encodeURIComponent(
              file.fileName
            )}&folder=${encodeURIComponent(folderName)}`;

            if (process.env.NODE_ENV === 'development') {
              console.log(`[useDataLoader] Fetching file: ${file.fileName}`, { url });
            }

            // HTTP cache headers are set on the API route for fast loads
            let fileResponse: Response;
            try {
              fileResponse = await fetch(url, {
                signal: getAbortController().signal
              });
            } catch (fetchError: any) {
              if (fetchError.name === 'AbortError') {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`[useDataLoader] File fetch aborted: ${file.fileName}`);
                }
                return null;
              }
              if (process.env.NODE_ENV === 'development') {
                console.error(`[useDataLoader] File fetch error: ${file.fileName}`, fetchError);
              }
              return null;
            }

            if (!fileResponse.ok) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`[useDataLoader] File fetch failed: ${file.fileName}`, {
                  status: fileResponse.status,
                  statusText: fileResponse.statusText,
                });
              }
              return null;
            }

            let fileData: any;
            try {
              fileData = await fileResponse.json();
            } catch (jsonError) {
              if (process.env.NODE_ENV === 'development') {
                console.error(`[useDataLoader] Failed to parse JSON for ${file.fileName}:`, jsonError);
              }
              return null;
            }
            
            if (!fileData.success) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`File ${file.fileName} returned unsuccessful response:`, fileData);
              }
              return null;
            }

            // The API returns { success: true, data: { data: jsonData, fileName, folder } }
            // So we need to extract the actual JSON data from fileData.data.data
            // Check if data.data exists (nested structure) or if data is the actual data (flat structure)
            let actualData = null;
            
            // First, try the nested structure (the expected format)
            if (fileData.data && typeof fileData.data === 'object' && 'data' in fileData.data) {
              actualData = fileData.data.data;
            } 
            // If that doesn't work, check if data itself is the array (fallback for different API formats)
            else if (fileData.data && Array.isArray(fileData.data)) {
              actualData = fileData.data;
            }
            // If data is an object but not the wrapper, it might be the actual data
            else if (fileData.data && typeof fileData.data === 'object' && !fileData.data.fileName && !fileData.data.folder) {
              actualData = fileData.data;
            }
            
            // Debug logging
            if (process.env.NODE_ENV === 'development') {
              console.log(`[useDataLoader] Processing file: ${file.fileName}`, {
                hasFileData: !!fileData,
                hasData: !!fileData.data,
                hasNestedData: !!fileData.data?.data,
                actualDataType: typeof actualData,
                isArray: Array.isArray(actualData),
                dataLength: Array.isArray(actualData) ? actualData.length : 'N/A',
                responseStructure: Object.keys(fileData),
                dataKeys: fileData.data && typeof fileData.data === 'object' ? Object.keys(fileData.data) : [],
              });
            }
            
            if (actualData === null || actualData === undefined) {
              if (process.env.NODE_ENV === 'development') {
                console.warn(`File ${file.fileName} has no data in response:`, {
                  fileData,
                  dataStructure: fileData.data,
                  hasNestedData: !!fileData.data?.data,
                });
              }
              return null;
            }
            
            // Ensure data is an array for chart files (D.json, M.json)
            if (file.fileName.includes('D.json') || file.fileName.includes('M.json')) {
              if (!Array.isArray(actualData)) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`File ${file.fileName} data is not an array:`, {
                    type: typeof actualData,
                    data: actualData,
                  });
                }
                return null;
              }
              if (actualData.length === 0) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`File ${file.fileName} data array is empty`);
                }
                return null;
              }
            }

            const result = {
              fileName: file.fileName,
              data: actualData,
              mimeType: file.mimeType,
              size: file.size,
              createdTime: file.createdTime,
              modifiedTime: file.modifiedTime
            };

            if (process.env.NODE_ENV === 'development') {
              console.log(`[useDataLoader] Successfully loaded file: ${file.fileName}`, {
                hasData: !!result.data,
                dataLength: Array.isArray(result.data) ? result.data.length : 'N/A',
              });
            }

            return result;
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`[useDataLoader] Error loading file: ${file.fileName}`, error);
            }
            return null;
          }
        });

        const quickResults = await Promise.allSettled(quickPromises);
        
        if (process.env.NODE_ENV === 'development') {
          const fulfilled = quickResults.filter(r => r.status === 'fulfilled').length;
          const rejected = quickResults.filter(r => r.status === 'rejected').length;
          console.log('[useDataLoader] Quick batch results', {
            total: quickResults.length,
            fulfilled,
            rejected,
            results: quickResults.map((r, i) => ({
              index: i,
              status: r.status,
              fileName: quickBatch[i]?.fileName,
              hasValue: r.status === 'fulfilled' && r.value !== null,
            })),
          });
        }
        
        const quickLoaded = quickResults
          .filter(
            (result): result is PromiseFulfilledResult<LoadedFlashcardFile | null> =>
              result.status === "fulfilled" && result.value !== null
          )
          .map(result => result.value as LoadedFlashcardFile);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Quick batch loaded', {
            quickBatchSize: quickBatch.length,
            quickLoadedCount: quickLoaded.length,
            loadedFileNames: quickLoaded.map(f => f.fileName),
            filesWithData: quickLoaded.filter(f => f.data !== null && f.data !== undefined).length,
          });
        }
        
        loadedFiles.push(...quickLoaded);

        checkAndShowUI(loadedFiles);

        const prioritizedRemainder = finalPrioritizedFiles.filter(
          file => !quickBatchFileNames.has(file.fileName)
        );

        if (!uiReady && prioritizedRemainder.length > 0) {
          const nextQuickBatch = prioritizedRemainder.slice(
            0,
            Math.min(QUICK_BATCH_FILE_TARGET, prioritizedRemainder.length)
          );
          const nextQuickPromises = nextQuickBatch.map(async file => {
            try {
              const url = `/api/files/local-data?file=${encodeURIComponent(
                file.fileName
              )}&folder=${encodeURIComponent(folderName)}`;
              // HTTP cache headers are set on the API route for fast loads
              const fileResponse = await fetch(url, { 
                signal: getAbortController().signal
              });
              if (!fileResponse.ok) return null;
              const fileData = await fileResponse.json();
              if (!fileData.success) return null;
              
              // The API returns { success: true, data: { data: jsonData, fileName, folder } }
              // Check if data.data exists (nested structure) or if data is the actual data (flat structure)
              let actualData = null;
              
              // First, try the nested structure (the expected format)
              if (fileData.data && typeof fileData.data === 'object' && 'data' in fileData.data) {
                actualData = fileData.data.data;
              } 
              // If that doesn't work, check if data itself is the array (fallback for different API formats)
              else if (fileData.data && Array.isArray(fileData.data)) {
                actualData = fileData.data;
              }
              // If data is an object but not the wrapper, it might be the actual data
              else if (fileData.data && typeof fileData.data === 'object' && !fileData.data.fileName && !fileData.data.folder) {
                actualData = fileData.data;
              }
              
              if (actualData === null || actualData === undefined) {
                console.warn(`File ${file.fileName} has no data in response`);
                return null;
              }
              
              return {
                fileName: file.fileName,
                data: actualData,
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
            .filter(
              (result): result is PromiseFulfilledResult<LoadedFlashcardFile | null> =>
                result.status === "fulfilled" && result.value !== null
            )
            .map(result => result.value as LoadedFlashcardFile);
          loadedFiles.push(...nextQuickLoaded);
          checkAndShowUI(loadedFiles);
        }

        const loadedFileNameSet = new Set(loadedFiles.map(file => file.fileName));
        const remainingFiles = finalPrioritizedFiles.filter(
          file => !loadedFileNameSet.has(file.fileName)
        );

        if (remainingFiles.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] Starting background load', {
              remainingFilesCount: remainingFiles.length,
              batchSize: BACKGROUND_BATCH_SIZE,
              estimatedBatches: Math.ceil(remainingFiles.length / BACKGROUND_BATCH_SIZE),
            });
          }

          // Prevent multiple background loads
          if (isBackgroundLoadingRef.current && backgroundLoadingFolderRef.current === folderName) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] Skipping inline background load - already in progress');
            }
          } else {
            // Mark background loading as starting
            isBackgroundLoadingRef.current = true;
            backgroundLoadingFolderRef.current = folderName;

            (async () => {
              try {
                for (let i = 0; i < remainingFiles.length; i += BACKGROUND_BATCH_SIZE) {
                  // Check if we should abort (folder changed or fetch started)
                  if (isFetchingRef.current || lastFetchedFolderRef.current !== folderName) {
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[useDataLoader] Aborting inline background load - folder changed or new fetch started');
                    }
                    break;
                  }

                  if (process.env.NODE_ENV === 'development') {
                    console.log('[useDataLoader] Loading background batch', {
                      batchNumber: Math.floor(i / BACKGROUND_BATCH_SIZE) + 1,
                      filesInBatch: Math.min(BACKGROUND_BATCH_SIZE, remainingFiles.length - i),
                      progress: `${i}/${remainingFiles.length}`,
                    });
                  }

                  const batch = remainingFiles.slice(i, i + BACKGROUND_BATCH_SIZE);
                  const batchPromises = batch.map(async file => {
                    try {
                      const url = `/api/files/local-data?file=${encodeURIComponent(
                        file.fileName
                      )}&folder=${encodeURIComponent(folderName)}`;
                      // HTTP cache headers are set on the API route for fast loads
                      const fileResponse = await fetch(url, {
                        signal: getAbortController().signal
                      });
                      if (!fileResponse.ok) return null;
                      const fileData = await fileResponse.json();
                      if (!fileData.success) return null;
                      
                      // The API returns { success: true, data: { data: jsonData, fileName, folder } }
                      // Check if data.data exists (nested structure) or if data is the actual data (flat structure)
                      let actualData = null;
                      
                      // First, try the nested structure (the expected format)
                      if (fileData.data && typeof fileData.data === 'object' && 'data' in fileData.data) {
                        actualData = fileData.data.data;
                      } 
                      // If that doesn't work, check if data itself is the array (fallback for different API formats)
                      else if (fileData.data && Array.isArray(fileData.data)) {
                        actualData = fileData.data;
                      }
                      // If data is an object but not the wrapper, it might be the actual data
                      else if (fileData.data && typeof fileData.data === 'object' && !fileData.data.fileName && !fileData.data.folder) {
                        actualData = fileData.data;
                      }
                      
                      if (actualData === null || actualData === undefined) {
                        console.warn(`File ${file.fileName} has no data in response`);
                        return null;
                      }
                      
                      return {
                        fileName: file.fileName,
                        data: actualData,
                        mimeType: file.mimeType,
                        size: file.size,
                        createdTime: file.createdTime,
                        modifiedTime: file.modifiedTime
                      };
                    } catch {
                      return null;
                    }
                  });

                  const batchResults = await Promise.allSettled(batchPromises);
                  const batchLoaded = batchResults
                    .filter(
                      (result): result is PromiseFulfilledResult<LoadedFlashcardFile | null> =>
                        result.status === "fulfilled" && result.value !== null
                    )
                    .map(result => result.value as LoadedFlashcardFile);

                  if (batchLoaded.length > 0) {
                    loadedFiles.push(...batchLoaded);

                    // Use functional update with early return to prevent infinite loops
                    setFlashcards(prevCards => {
                      // Early return if no cards exist
                      if (!prevCards || prevCards.length === 0) {
                        return prevCards;
                      }

                      const updatedCards = prevCards.map(card => {
                        const stockDir = card.name || card.id;
                        const newFiles = batchLoaded.filter(
                          f => f && f.fileName.startsWith(`${stockDir}/`)
                        );

                        if (newFiles.length > 0) {
                          const existingFileNames = new Set(card.jsonFiles.map(f => f.fileName));
                          const uniqueNewFiles = newFiles.filter(
                            f => !existingFileNames.has(f.fileName)
                          );

                          // Only update if there are actually new files
                          if (uniqueNewFiles.length === 0) {
                            return card;
                          }

                          const hasEssentialFile = [...card.jsonFiles, ...uniqueNewFiles].some(f => {
                            const fileName = f.fileName.split("/").pop() || f.fileName;
                            return essentialFileNamesSet.has(fileName);
                          });

                          return {
                            ...card,
                            jsonFiles: [...card.jsonFiles, ...uniqueNewFiles],
                            isReady: hasEssentialFile
                          };
                        }

                        return card;
                      });

                      const existingStockDirs = new Set(
                        updatedCards.map(card => card.name || card.id)
                      );
                      const stockGroups = new Map<string, LoadedFlashcardFile[]>();
                      batchLoaded.forEach(file => {
                        if (file) {
                          const stockDir = file.fileName.split("/")[0];
                          if (!existingStockDirs.has(stockDir)) {
                            if (!stockGroups.has(stockDir)) {
                              stockGroups.set(stockDir, []);
                            }
                            stockGroups.get(stockDir)!.push(file);
                          }
                        }
                      });

                      const newCards = Array.from(stockGroups.entries()).map(([stockDir, stockFiles]) => {
                        const hasEssentialFile = stockFiles.some(f => {
                          const fileName = f.fileName.split("/").pop() || f.fileName;
                          return essentialFileNamesSet.has(fileName);
                        });
                        return {
                          id: stockDir,
                          name: stockDir,
                          folderName,
                          jsonFiles: stockFiles,
                          isReady: hasEssentialFile
                        };
                      });

                      // Only update if there are new cards or actual changes
                      if (newCards.length === 0) {
                        // Check if any cards were actually updated
                        const hasChanges = updatedCards.some((card, index) => {
                          const original = prevCards[index];
                          if (!original) return true;
                          return card.jsonFiles.length !== original.jsonFiles.length ||
                                 card.isReady !== original.isReady;
                        });

                        if (!hasChanges) {
                          return prevCards; // No changes, return previous to prevent re-render
                        }
                      }

                      // Append new cards to the end to maintain deterministic order
                      // DO NOT use random insertion as it breaks the seeded shuffle order
                      const combinedCards = [...updatedCards, ...newCards];

                      if (process.env.NODE_ENV === 'development') {
                        console.log('[useDataLoader] Background loading added cards:', {
                          previousLength: prevCards.length,
                          newCardsAdded: newCards.length,
                          newTotalLength: combinedCards.length,
                          newStocks: newCards.map(c => c.name || c.id),
                        });
                      }

                      return combinedCards;
                    });
                  }
                }
              } finally {
                // Always reset background loading flag when done
                isBackgroundLoadingRef.current = false;
                backgroundLoadingFolderRef.current = null;
              }
            })();
          }
        }

        const validFiles = toFlashcardFiles(loadedFiles);

        if (validFiles.length === 0) {
          throw new Error(ERROR_MESSAGES.NO_DATA_AVAILABLE);
        }

        const stockGroups = new Map<string, LoadedFlashcardFile[]>();
        validFiles.forEach(file => {
          if (file) {
            const stockDir = file.fileName.split("/")[0];
            if (!stockGroups.has(stockDir)) {
              stockGroups.set(stockDir, []);
            }
            stockGroups.get(stockDir)!.push(file);
          }
        });
        
        // Log the order before any shuffle to see if it's alphabetical
        if (process.env.NODE_ENV === 'development') {
          const stockDirs = Array.from(stockGroups.keys());
          console.log('[useDataLoader] Stock groups created (before shuffle)', {
            count: stockDirs.length,
            firstFive: stockDirs.slice(0, 5),
            isAlphabetical: stockDirs.slice(0, 5).every((dir, i, arr) => 
              i === 0 || dir >= arr[i - 1]
            ),
          });
        }

        // CRITICAL: If checkAndShowUI already set flashcards (uiReady is true), 
        // don't overwrite them with unshuffled order from fallback path
        if (uiReady) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] Skipping fallback - flashcards already set by checkAndShowUI', {
              folderName,
              stockCount: stockGroups.size,
            });
          }
          // Still need to set loading to false and cleanup
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            loadingTimeout = null;
          }
          setLoading(false);
          setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
          setLoadingStep("");
          isFetchingRef.current = false;
          return;
        }

        // Use the same seeded shuffle from above (already defined at the top)
        // DO NOT create a new unseeded shuffleArray here
        // Always shuffle on first load for a folder - check if this is a new folder
        const stockEntries = Array.from(stockGroups.entries());
        // ALWAYS shuffle on first load - force it regardless of ref state
        // This ensures random order on every page load/refresh
        // Shuffle if: folder changed, never shuffled for this folder, or this is the first fetch ever
        const shouldShuffle = stockEntries.length > 0 && (
          hasShuffledForFolderRef.current !== folderName || 
          hasShuffledForFolderRef.current === null
        );
        let shuffledStockEntries: typeof stockEntries;
        
        // CRITICAL: Always shuffle on first load, no matter what
        if (shouldShuffle && stockEntries.length > 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] BEFORE SHUFFLE (fallback path)', {
              folderName,
              stockCount: stockEntries.length,
              firstThree: stockEntries.slice(0, 3).map(([dir]) => dir),
              hasShuffledForFolder: hasShuffledForFolderRef.current,
            });
          }
          
          shuffledStockEntries = shuffleArray(stockEntries);
          
          // Mark as shuffled immediately to prevent re-shuffling
          hasShuffledForFolderRef.current = folderName;
          
          if (process.env.NODE_ENV === 'development') {
            console.log('[useDataLoader] AFTER SHUFFLE (fallback path)', {
              folderName,
              stockCount: shuffledStockEntries.length,
              firstThree: shuffledStockEntries.slice(0, 3).map(([dir]) => dir),
              changed: stockEntries[0]?.[0] !== shuffledStockEntries[0]?.[0],
            });
          }
        } else {
          shuffledStockEntries = stockEntries; // Don't re-shuffle if already shuffled for this folder
          if (process.env.NODE_ENV === 'development') {
            console.warn('[useDataLoader] SKIPPING SHUFFLE (fallback path)', {
              folderName,
              hasShuffledForFolder: hasShuffledForFolderRef.current,
              shouldShuffle,
              firstStock: stockEntries[0]?.[0],
            });
          }
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Shuffling stocks (fallback)', {
            folderName,
            previousFolder: currentPreviousFolder,
            hasShuffledForFolder: hasShuffledForFolderRef.current,
            shouldShuffle,
            stockCount: stockEntries.length,
            firstStockBefore: stockEntries[0]?.[0],
            firstStockAfter: shuffledStockEntries[0]?.[0],
            entriesBefore: stockEntries.slice(0, 3).map(([dir]) => dir),
            entriesAfter: shuffledStockEntries.slice(0, 3).map(([dir]) => dir),
          });
        }

        const flashcardData = shuffledStockEntries.map(([stockDir, stockFiles]) => {
          const hasEssentialFile = stockFiles.some(f => {
            const fileName = f.fileName.split("/").pop() || f.fileName;
            return essentialFileNamesSet.has(fileName);
          });

          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log(`[useDataLoader] Creating flashcard for ${stockDir} (fallback)`, {
              stockFilesCount: stockFiles.length,
              fileNames: stockFiles.map(f => f.fileName),
              hasEssentialFile,
              filesWithData: stockFiles.filter(f => f.data !== null && f.data !== undefined).length,
            });
          }

          return {
            id: stockDir,
            name: stockDir,
            folderName,
            jsonFiles: stockFiles,
            isReady: hasEssentialFile
          };
        });

        const readyFlashcards = flashcardData.filter(f => f.isReady);
        // flashcardData is already shuffled via shuffledStockEntries
        // NO need to shuffle again - this was causing re-ordering

        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Setting flashcards (fallback)', {
            flashcardCount: flashcardData.length,
            readyCount: readyFlashcards.length,
            firstFlashcard: flashcardData[0] ? {
              id: flashcardData[0].id,
              name: flashcardData[0].name,
              jsonFilesCount: flashcardData[0].jsonFiles?.length,
              jsonFileNames: flashcardData[0].jsonFiles?.map(f => f.fileName),
              hasData: flashcardData[0].jsonFiles?.some(f => f.data !== null && f.data !== undefined),
            } : null,
          });
        }

        setFlashcards(flashcardData);
        // Note: shuffle flag is already set above if we shuffled

        // Clear the timeout since we're done loading
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }

        // Always set loading to false when we have flashcards, even if none are "ready"
        // This prevents the UI from being stuck in a loading state
        if (flashcardData.length > 0) {
          setLoading(false);
          setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
          setLoadingStep("");
        } else {
          // If we have no flashcards at all, set loading to false anyway to prevent stuck state
          setLoading(false);
          setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
          setLoadingStep("");
        }

        // Reset fetching flag after successful completion
        isFetchingRef.current = false;

        const loadedFileNames = new Set(validFiles.map(f => f.fileName));

        const missingFiles = (selectedFolderData?.files || []).filter(file => {
          return file && file.fileName && !loadedFileNames.has(file.fileName);
        });

        if (missingFiles.length > 0 || loadedFiles.length < files.length) {
          // Only call background loading if we have missing files and we're not fetching
          // Also check if background loading is already in progress
          if (missingFiles.length > 0 && !isFetchingRef.current && !isBackgroundLoadingRef.current) {
            try {
              loadMissingFilesInBackground(missingFiles, folderName, updateFn => {
                setFlashcards(prevCards => {
                  try {
                    return updateFn(prevCards || []);
                  } catch (err) {
                    console.error('[useDataLoader] Error updating flashcards in background:', err);
                    return prevCards || [];
                  }
                });
              });
            } catch (err) {
              console.error('[useDataLoader] Error starting background file load:', err);
              // Reset background loading flag on error
              isBackgroundLoadingRef.current = false;
              backgroundLoadingFolderRef.current = null;
            }
          }
        }
      } catch (error) {
        // Clear the timeout on error
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
        }
        setError(error instanceof Error ? error.message : ERROR_MESSAGES.DATA_FETCH_ERROR);
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStep("");
        // Reset fetching flag on error
        isFetchingRef.current = false;
      }
    },
    [
      selectedFolder,
      cleanup,
      setLoading,
      setLoadingProgress,
      setLoadingStep,
      clearError,
      setError,
      updateFolders,
      setFlashcards,
      getAbortController
      // Note: loadMissingFilesInBackground is intentionally omitted from dependencies
      // because it has an empty dependency array and is stable
    ]
  );

  return {
    fetchFolders,
    fetchFlashcards,
    cleanup
  };
};

