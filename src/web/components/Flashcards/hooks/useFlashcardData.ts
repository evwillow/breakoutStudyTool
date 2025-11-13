"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type {
  FolderOption,
  UseFlashcardDataOptions,
  UseFlashcardDataReturn
} from "@breakout-study-tool/shared";
import type { FlashcardData } from "../utils/dataProcessors";
import { useLoadingState } from "./useLoadingState";
import { useFolderManagement } from "./useFolderManagement";
import { useDataLoader } from "./useDataLoader";

export type { FolderOption, UseFlashcardDataReturn, UseFlashcardDataOptions };

export function useFlashcardData(
  options: UseFlashcardDataOptions = {}
): UseFlashcardDataReturn {
  const { currentIndex = 0, autoSelectFirstFolder = true } = options;
  const { data: session, status } = useSession();

  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);

  const {
    loading,
    loadingProgress,
    loadingStep,
    error,
    setLoading,
    setLoadingProgress,
    setLoadingStep,
    setError,
    clearError
  } = useLoadingState();

  const { folderOptions, selectedFolder, updateFolders, setSelectedFolder } =
    useFolderManagement({ autoSelectFirstFolder });

  const { fetchFolders, fetchFlashcards, cleanup } = useDataLoader({
    autoSelectFirstFolder,
    selectedFolder,
    status,
    session,
    updateFolders,
    setSelectedFolder,
    setFlashcards,
    loadingActions: {
      setLoading,
      setLoadingProgress,
      setLoadingStep,
      setError,
      clearError
    }
  });

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (selectedFolder) {
      fetchFlashcards(selectedFolder);
    }
  }, [selectedFolder, fetchFlashcards]);

  useEffect(() => () => cleanup(), [cleanup]);

  const handleSetSelectedFolder = useCallback(
    (folder: string | null) => {
      setSelectedFolder(folder);
      setFlashcards([]);
      clearError();
      if (folder) {
        fetchFlashcards(folder);
      }
    },
    [setSelectedFolder, clearError, fetchFlashcards]
  );

  const refetchFolders = useCallback(() => fetchFolders(), [fetchFolders]);

  const refetchFlashcards = useCallback(
    () => fetchFlashcards(selectedFolder ?? undefined),
    [fetchFlashcards, selectedFolder]
  );

  const currentFlashcard = useMemo(
    () => flashcards[currentIndex] ?? null,
    [flashcards, currentIndex]
  );

  return {
    folders: folderOptions,
    flashcards,
    selectedFolder,
    currentFlashcard,
    loading,
    loadingProgress,
    loadingStep,
    error,
    setSelectedFolder: handleSetSelectedFolder,
    refetchFolders,
    refetchFlashcards,
    clearError
  };
}

