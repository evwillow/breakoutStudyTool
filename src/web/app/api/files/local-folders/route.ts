/**
 * @fileoverview Lists available local dataset folders for flashcard selection.
 * @module src/web/app/api/files/local-folders/route.ts
 * @dependencies next/server, node:path, node:fs/promises
 */
import { NextRequest } from 'next/server';
import { success, error } from '@/lib/api/responseHelpers';
import { fetchLocalFolders } from '@/services/flashcard/flashcardService';

/**
 * Local Folders API Route
 * 
 * Serves folder data from the local data-processing directory
 * instead of Google Drive API.
 */

export async function GET(_req: NextRequest) {
  try {
    const { folders, totalFiles } = await fetchLocalFolders();
    return success({ folders, totalFiles });
  } catch (error: any) {
    console.error('[local-folders API] Error reading local folders:', error);
    console.error('[local-folders API] Error type:', typeof error);
    console.error('[local-folders API] Error keys:', error ? Object.keys(error) : 'null');
    
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    return error(errorMessage, 500);
  }
}
