/**
 * @fileoverview Server-side flashcard service functions (API routes only).
 * @module src/web/services/flashcard/flashcardService.ts
 * @dependencies @/lib/cache/localDataCache
 * 
 * NOTE: This file contains server-only functions that use Node.js fs module.
 * For client-safe utilities, import from './flashcardUtils' instead.
 */
import { getFolderIndex, getFileData } from '@/lib/cache/localDataCache';

export interface FolderIndexResult {
  folders: Awaited<ReturnType<typeof getFolderIndex>>;
  totalFiles: number;
}

/**
 * Server-only: Fetch local folder index from filesystem
 * Use only in API routes, not in client components
 */
export async function fetchLocalFolders(): Promise<FolderIndexResult> {
  const folders = await getFolderIndex();
  const totalFiles = folders.reduce((count, folder) => count + folder.files.length, 0);
  return { folders, totalFiles };
}

export interface LocalFileParams {
  fileName: string;
}

/**
 * Server-only: Fetch local file data from filesystem
 * Use only in API routes, not in client components
 */
export async function fetchLocalFile({ fileName }: LocalFileParams) {
  const data = await getFileData(fileName);
  return data;
}

// Re-export client-safe utilities
export * from './flashcardUtils';

