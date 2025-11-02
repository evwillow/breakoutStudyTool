import React from 'react';
import { Session } from 'next-auth';
import { FlashcardData } from '../Flashcards/utils/dataProcessors';

export interface DateFolderBrowserProps {
  session: Session | null;
  currentStock: string | null;
  isTimeUp: boolean;
  flashcards?: FlashcardData[];
  currentFlashcard?: FlashcardData | null;
}

declare const DateFolderBrowser: React.FC<DateFolderBrowserProps>;
export default DateFolderBrowser;

