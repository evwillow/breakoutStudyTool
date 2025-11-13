import type { Session } from "next-auth";
import type { SessionStatus } from "next-auth/react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { FlashcardData } from "../utils/dataProcessors";

export interface FlashcardFolderFile {
  fileName: string;
  mimeType?: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  [key: string]: unknown;
}

export interface FlashcardFolderRecord {
  id?: string;
  name: string;
  files?: FlashcardFolderFile[];
  [key: string]: unknown;
}

export type FlashcardDataSetter = Dispatch<SetStateAction<FlashcardData[]>>;

export interface LoadingActions {
  setLoading: (value: boolean) => void;
  setLoadingProgress: (value: number) => void;
  setLoadingStep: (value: string) => void;
  setError: (value: string | null) => void;
  clearError: () => void;
}

export interface DataLoaderParams {
  autoSelectFirstFolder: boolean;
  selectedFolder: string | null;
  status: SessionStatus;
  session: Session | null;
  updateFolders: (folders: FlashcardFolderRecord[]) => void;
  setSelectedFolder: (folder: string | null) => void;
  setFlashcards: FlashcardDataSetter;
  loadingActions: LoadingActions;
}

export interface LoadingStateRefs {
  abortControllerRef: MutableRefObject<AbortController | null>;
  foldersCacheRef: MutableRefObject<FlashcardFolderRecord[]>;
}

export type FlashcardUpdater = (updater: (prev: FlashcardData[]) => FlashcardData[]) => void;

export type BackgroundUpdateFn = (updateFn: (prevCards: FlashcardData[]) => FlashcardData[]) => void;


