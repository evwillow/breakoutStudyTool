"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FolderOption } from "@breakout-study-tool/shared";
import type { FlashcardFolderRecord } from "./types";

interface FolderManagementOptions {
  autoSelectFirstFolder: boolean;
}

export const useFolderManagement = ({ autoSelectFirstFolder }: FolderManagementOptions) => {
  const [folders, setFolders] = useState<FlashcardFolderRecord[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const foldersRef = useRef<FlashcardFolderRecord[]>([]);

  const updateFolders = useCallback((nextFolders: FlashcardFolderRecord[]) => {
    foldersRef.current = nextFolders;
    setFolders(nextFolders);
  }, []);

  useEffect(() => {
    if (!autoSelectFirstFolder) return;
    if (selectedFolder) return;
    if (foldersRef.current.length > 0) {
      const firstFolderName = foldersRef.current[0].name;
      if (process.env.NODE_ENV === 'development') {
        console.log('[useFolderManagement] Auto-selecting first folder', {
          folderName: firstFolderName,
          totalFolders: foldersRef.current.length,
          folderNames: foldersRef.current.map(f => f.name),
        });
      }
      setSelectedFolder(firstFolderName);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('[useFolderManagement] No folders available for auto-selection', {
          foldersLength: foldersRef.current.length,
        });
      }
    }
  }, [autoSelectFirstFolder, selectedFolder, folders]);

  const folderOptions: FolderOption[] = useMemo(
    () =>
      folders.map(({ id, name }) => ({
        key: id,
        value: name,
        label: name
      })),
    [folders]
  );

  return {
    folders,
    selectedFolder,
    folderOptions,
    updateFolders,
    setSelectedFolder
  };
};

