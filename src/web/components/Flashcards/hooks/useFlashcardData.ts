"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import type {
  FolderOption,
  UseFlashcardDataOptions,
  UseFlashcardDataReturn as SharedUseFlashcardDataReturn
} from "@breakout-study-tool/shared";
import type { FlashcardData } from '@breakout-study-tool/shared';
import { useLoadingState } from "./useLoadingState";
import { useFolderManagement } from "./useFolderManagement";
import { useDataLoader } from "./useDataLoader";

// Extend the shared type to include shuffleFlashcards
export interface UseFlashcardDataReturn extends SharedUseFlashcardDataReturn {
  shuffleFlashcards: () => void;
}

export type { FolderOption, UseFlashcardDataOptions };

export function useFlashcardData(
  options: UseFlashcardDataOptions = {}
): UseFlashcardDataReturn {
  const { currentIndex = 0, autoSelectFirstFolder = true } = options;
  const { data: session, status } = useSession();

  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);

  // Debug logging removed for cleaner console

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

  // Shuffle flashcards randomly (truly random, not seeded)
  const shuffleFlashcards = useCallback(() => {
    setFlashcards(prevCards => {
      if (prevCards.length <= 1) return prevCards;

      // Fisher-Yates shuffle with Math.random() for true randomization
      const shuffled = [...prevCards];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Logging removed

      return shuffled;
    });
  }, []);

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
    shuffleFlashcards,
    refetchFolders,
    refetchFlashcards,
    clearError
  };
}

