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
      setSelectedFolder(firstFolderName);
    }
  }, [autoSelectFirstFolder, selectedFolder, folders]);

  const folderOptions: FolderOption[] = useMemo(
    () =>
      (folders || [])
        .filter(({ id }) => id !== undefined && id !== null)
        .map(({ id, name }) => ({
          key: id!,
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

