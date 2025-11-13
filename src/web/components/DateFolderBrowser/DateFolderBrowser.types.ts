import { Session } from 'next-auth';
import { FlashcardData } from '../Flashcards/utils/dataProcessors';

/**
 * File entry structure for previous setups
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

