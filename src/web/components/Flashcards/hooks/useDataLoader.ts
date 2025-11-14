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

  // Keep ref in sync with selectedFolder
  useEffect(() => {
    selectedFolderRef.current = selectedFolder;
  }, [selectedFolder]);

  const getAbortController = useCallback(() => {
    if (!abortControllerRef.current) {
      abortControllerRef.current = new AbortController();
    }
    return abortControllerRef.current;
  }, []);

  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
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
            const actualData = fileData.data?.data ?? fileData.data;

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

      isFetchingRef.current = true;
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
        const INITIAL_STOCK_COUNT = 2;
        const QUICK_BATCH_FILE_TARGET = 30; // Increased from 18 for faster initial load
        const BACKGROUND_BATCH_SIZE = 100; // Increased from 50 for faster background loading

        const loadedFiles: LoadedFlashcardFile[] = [];
        let uiReady = false;
        let initialShuffleSeed: number | null = null;

        const checkAndShowUI = (currentFiles: LoadedFlashcardFile[]) => {
          if (uiReady) return;

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
            if (initialShuffleSeed === null) {
              let seed = 0;
              for (let i = 0; i < folderName.length; i++) {
                seed = (seed << 5) - seed + folderName.charCodeAt(i);
                seed |= 0;
              }
              initialShuffleSeed = Math.abs(seed);
            }

            let seedValue = initialShuffleSeed;
            const seededRandom = () => {
              seedValue = (seedValue * 9301 + 49297) % 233280;
              return seedValue / 233280;
            };

            const shuffleArray = <T,>(array: T[]): T[] => {
              const shuffled = [...array];
              for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(seededRandom() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
              }
              return shuffled;
            };

            const stockEntries = Array.from(tempStockGroups.entries());
            const shuffledStockEntries = shuffleArray(stockEntries);

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
                jsonFiles: stockFiles,
                isReady: hasEssentialFile
              };
            });

            const shuffledFlashcardData = shuffleArray(flashcardData);
            
            if (process.env.NODE_ENV === 'development') {
              console.log('[useDataLoader] Setting flashcards', {
                flashcardCount: shuffledFlashcardData.length,
                readyCount: shuffledFlashcardData.filter(f => f.isReady).length,
                firstFlashcard: shuffledFlashcardData[0] ? {
                  id: shuffledFlashcardData[0].id,
                  name: shuffledFlashcardData[0].name,
                  jsonFilesCount: shuffledFlashcardData[0].jsonFiles?.length,
                  jsonFileNames: shuffledFlashcardData[0].jsonFiles?.map(f => f.fileName),
                  hasData: shuffledFlashcardData[0].jsonFiles?.some(f => f.data !== null && f.data !== undefined),
                } : null,
              });
            }
            
            setFlashcards(shuffledFlashcardData);
            setLoading(false);
            setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
            setLoadingStep("");
            uiReady = true;
          }
        };

        const essentialNames = new Set(["D.json", "M.json"]);
        const dateFilePattern = /^[A-Za-z]{3}_\d{1,2}_\d{4}\.json$/;

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

          stockFiles
            .filter(file => {
              const lastPart = (file.fileName.split("/").pop() || file.fileName).toLowerCase();
              return essentialFileNamesLower.has(lastPart);
            })
            .forEach(tryAddFile);

          const pointsFile = stockFiles.find(file => {
            const lastPart = (file.fileName.split("/").pop() || file.fileName).toLowerCase();
            return optionalPriorityLower.has(lastPart);
          });
          if (pointsFile) {
            tryAddFile(pointsFile);
          }

          const afterFile = stockFiles.find(file => {
            const lastPart = (file.fileName.split("/").pop() || file.fileName).toLowerCase();
            return lastPart === afterFileNameLower;
          });
          if (afterFile) {
            tryAddFile(afterFile);
          }

          stockFiles
            .filter(file => {
              const lastPart = file.fileName.split("/").pop() || file.fileName;
              return dateFilePattern.test(lastPart);
            })
            .slice(0, 3)
            .forEach(tryAddFile);

          if (addedForStock) {
            stocksLoaded.add(stockDir);
          }

          if (quickBatch.length >= QUICK_BATCH_FILE_TARGET) break;
          if (stocksLoaded.size >= INITIAL_STOCK_COUNT && quickBatch.length >= 6) break;
        }

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

        const quickBatchFileNames = new Set(quickBatch.map(file => file.fileName));

        // Fetch all files in parallel for maximum speed
        const quickPromises = quickBatch.map(async file => {
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
            if (!fileData.success) {
              console.warn(`File ${file.fileName} returned unsuccessful response:`, fileData);
              return null;
            }

            // The API returns { success: true, data: { data: jsonData, fileName, folder } }
            // So we need to extract the actual JSON data from fileData.data.data
            const actualData = fileData.data?.data ?? fileData.data;
            
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
              });
            }
            
            if (!actualData) {
              console.warn(`File ${file.fileName} has no data in response:`, fileData);
              return null;
            }
            
            // Ensure data is an array for chart files (D.json, M.json)
            if (file.fileName.includes('D.json') || file.fileName.includes('M.json')) {
              if (!Array.isArray(actualData)) {
                console.warn(`File ${file.fileName} data is not an array:`, {
                  type: typeof actualData,
                  data: actualData,
                });
                return null;
              }
              if (actualData.length === 0) {
                console.warn(`File ${file.fileName} data array is empty`);
                return null;
              }
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

        const quickResults = await Promise.allSettled(quickPromises);
        const quickLoaded = quickResults
          .filter(
            (result): result is PromiseFulfilledResult<LoadedFlashcardFile | null> =>
              result.status === "fulfilled" && result.value !== null
          )
          .map(result => result.value as LoadedFlashcardFile);
        loadedFiles.push(...quickLoaded);

        checkAndShowUI(loadedFiles);

        const prioritizedRemainder = prioritizedFiles.filter(
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
              const actualData = fileData.data?.data ?? fileData.data;
              
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
        const remainingFiles = prioritizedFiles.filter(
          file => !loadedFileNameSet.has(file.fileName)
        );

        if (remainingFiles.length > 0) {
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
                      const actualData = fileData.data?.data ?? fileData.data;
                      
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

                      const combinedCards = [...updatedCards];
                      newCards.forEach(newCard => {
                        const randomIndex = Math.floor(Math.random() * (combinedCards.length + 1));
                        combinedCards.splice(randomIndex, 0, newCard);
                      });

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

        const shuffleArray = <T,>(array: T[]): T[] => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        const stockEntries = Array.from(stockGroups.entries());
        const shuffledStockEntries = shuffleArray(stockEntries);

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
        const shuffledFlashcardData = shuffleArray(flashcardData);

        if (process.env.NODE_ENV === 'development') {
          console.log('[useDataLoader] Setting flashcards (fallback)', {
            flashcardCount: shuffledFlashcardData.length,
            readyCount: readyFlashcards.length,
            firstFlashcard: shuffledFlashcardData[0] ? {
              id: shuffledFlashcardData[0].id,
              name: shuffledFlashcardData[0].name,
              jsonFilesCount: shuffledFlashcardData[0].jsonFiles?.length,
              jsonFileNames: shuffledFlashcardData[0].jsonFiles?.map(f => f.fileName),
              hasData: shuffledFlashcardData[0].jsonFiles?.some(f => f.data !== null && f.data !== undefined),
            } : null,
          });
        }

        setFlashcards(shuffledFlashcardData);

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

