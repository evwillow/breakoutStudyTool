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
      const response = await fetch("/api/files/local-folders");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error fetching folders");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.folders)) {
        foldersCacheRef.current = data.folders;
        updateFolders(data.folders);

        if (autoSelectFirstFolder && data.folders.length > 0) {
          // Use ref to check current selectedFolder to avoid dependency issues
          if (!selectedFolderRef.current) {
            setSelectedFolder(data.folders[0].name);
          }
        }
      } else {
        setError("Invalid folder data received from API");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : ERROR_MESSAGES.DATA_FETCH_ERROR);
    }
  }, [autoSelectFirstFolder, updateFolders, setError, setSelectedFolder]);

  const loadMissingFilesInBackground = useCallback(
    async (
      missingFiles: FlashcardFolderFile[],
      folderName: string,
      updateFlashcards: BackgroundUpdateFn
    ) => {
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

            return {
              fileName: file.fileName,
              data: fileData.data
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
    },
    []
  );

  const fetchFlashcards = useCallback(
    async (targetFolder?: string) => {
      const folderName = targetFolder ?? selectedFolder;

      if (!folderName) {
        return;
      }

      cleanup();

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
          foldersCacheRef.current = data.folders;
          updateFolders(data.folders);
          fetchedFromNetwork = true;
        }

        let selectedFolderData = foldersPayload?.find(
          (folder: FlashcardFolderRecord) => folder.name === folderName
        );

        if (!selectedFolderData || !selectedFolderData.files || selectedFolderData.files.length === 0) {
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
        const QUICK_BATCH_FILE_TARGET = 18;
        const BACKGROUND_BATCH_SIZE = 50;

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

          if (hasReadyFlashcard && currentFiles.length >= 3) {
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

              return {
                id: stockDir,
                name: stockDir,
                folderName,
                jsonFiles: stockFiles,
                isReady: hasEssentialFile
              };
            });

            const shuffledFlashcardData = shuffleArray(flashcardData);
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

        const quickPromises = quickBatch.map(async file => {
          try {
            const url = `/api/files/local-data?file=${encodeURIComponent(
              file.fileName
            )}&folder=${encodeURIComponent(folderName)}`;

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
          (async () => {
            for (let i = 0; i < remainingFiles.length; i += BACKGROUND_BATCH_SIZE) {
              const batch = remainingFiles.slice(i, i + BACKGROUND_BATCH_SIZE);
              const batchPromises = batch.map(async file => {
                try {
                  const url = `/api/files/local-data?file=${encodeURIComponent(
                    file.fileName
                  )}&folder=${encodeURIComponent(folderName)}`;
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

              const batchResults = await Promise.allSettled(batchPromises);
              const batchLoaded = batchResults
                .filter(
                  (result): result is PromiseFulfilledResult<LoadedFlashcardFile | null> =>
                    result.status === "fulfilled" && result.value !== null
                )
                .map(result => result.value as LoadedFlashcardFile);

              if (batchLoaded.length > 0) {
                loadedFiles.push(...batchLoaded);

                setFlashcards(prevCards => {
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

                  const combinedCards = [...updatedCards];
                  newCards.forEach(newCard => {
                    const randomIndex = Math.floor(Math.random() * (combinedCards.length + 1));
                    combinedCards.splice(randomIndex, 0, newCard);
                  });

                  return combinedCards;
                });
              }
            }
          })();
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

        setFlashcards(shuffledFlashcardData);

        if (readyFlashcards.length > 0) {
          setLoading(false);
          setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.COMPLETE);
          setLoadingStep("");
        }

        const loadedFileNames = new Set(validFiles.map(f => f.fileName));

        const missingFiles = selectedFolderData.files.filter(file => {
          return !loadedFileNames.has(file.fileName);
        });

        if (missingFiles.length > 0 || loadedFiles.length < files.length) {
          loadMissingFilesInBackground(missingFiles, folderName, updateFn => {
            setFlashcards(prevCards => updateFn(prevCards));
          });
        }

        if (readyFlashcards.length === 0) {
          setLoadingProgress(UI_CONFIG.LOADING_PROGRESS_STEPS.FINALIZING);
          setLoadingStep("Finalizing dataset...");
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : ERROR_MESSAGES.DATA_FETCH_ERROR);
        setLoading(false);
        setLoadingProgress(0);
        setLoadingStep("");
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
      loadMissingFilesInBackground,
      setFlashcards,
      getAbortController
    ]
  );

  return {
    fetchFolders,
    fetchFlashcards,
    cleanup
  };
};

