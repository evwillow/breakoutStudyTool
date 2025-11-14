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
    if (process.env.NODE_ENV === 'development') {
      console.log('[useFlashcardData] Fetching folders');
    }
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    if (selectedFolder) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useFlashcardData] Selected folder changed, fetching flashcards', {
          selectedFolder,
        });
      }
      fetchFlashcards(selectedFolder);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useFlashcardData] No folder selected, not fetching flashcards');
      }
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

      if (process.env.NODE_ENV === 'development') {
        console.log('[useFlashcardData] Flashcards shuffled', {
          originalFirst: prevCards[0]?.id,
          shuffledFirst: shuffled[0]?.id,
          count: shuffled.length,
        });
      }

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

