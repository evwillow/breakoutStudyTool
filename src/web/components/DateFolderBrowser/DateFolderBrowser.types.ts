import { Session } from 'next-auth';
import { FlashcardData } from '../Flashcards/utils/dataProcessors';

/**
 * @fileoverview Type definitions for DateFolderBrowser props and helper maps.
 * @module src/web/components/DateFolderBrowser/DateFolderBrowser.types.ts
 * @dependencies none
 */
export interface PreviousSetupFile {
  id: string;
  subfolder: string;
  fileName: string;
  data?: unknown;
  path: string;
  breakoutDate: Date;
  directoryName: string;
}

/**
 * File data mapping structure
 */
export interface FileDataMap {
  [fileId: string]: unknown;
}

/**
 * Combined file data with separate d and after data
 */
export interface CombinedFileData {
  d: unknown[];
  after: unknown[] | null;
}

/**
 * File refs mapping structure
 */
export interface FileRefsMap {
  [fileId: string]: React.RefObject<HTMLDivElement>;
}

/**
 * DateFolderBrowser component props
 */
export interface DateFolderBrowserProps {
  session: Session | null;
  currentStock: string | null;
  flashcards?: FlashcardData[];
  currentFlashcard?: FlashcardData | null;
  onChartExpanded?: (() => void) | null;
}

