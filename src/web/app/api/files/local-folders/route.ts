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
    console.log('[local-folders API] Starting folder fetch...');
    const result = await fetchLocalFolders();
    console.log('[local-folders API] fetchLocalFolders returned:', {
      hasResult: !!result,
      hasFolders: !!result?.folders,
      foldersType: Array.isArray(result?.folders) ? 'array' : typeof result?.folders,
      foldersLength: Array.isArray(result?.folders) ? result.folders.length : 'N/A',
      totalFiles: result?.totalFiles,
    });
    
    if (!result) {
      console.error('[local-folders API] fetchLocalFolders returned null/undefined');
      return error('Failed to fetch folders: no result returned', 500);
    }
    
    if (!result.folders) {
      console.error('[local-folders API] fetchLocalFolders result missing folders property:', result);
      return error('Failed to fetch folders: missing folders property', 500);
    }
    
    if (!Array.isArray(result.folders)) {
      console.error('[local-folders API] folders is not an array:', {
        type: typeof result.folders,
        value: result.folders,
      });
      return error('Failed to fetch folders: folders is not an array', 500);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[local-folders API] Successfully fetched folders', {
        foldersCount: result.folders.length,
        totalFiles: result.totalFiles,
      });
    }
    
    const responseData = { folders: result.folders, totalFiles: result.totalFiles };
    console.log('[local-folders API] Returning response with data:', {
      hasFolders: !!responseData.folders,
      foldersLength: responseData.folders.length,
      totalFiles: responseData.totalFiles,
    });
    
    return success(responseData);
  } catch (err: any) {
    console.error('[local-folders API] Exception caught:', err);
    console.error('[local-folders API] Error type:', typeof err);
    console.error('[local-folders API] Error message:', err?.message);
    console.error('[local-folders API] Error stack:', err?.stack);
    
    const errorMessage = err?.message || err?.toString() || 'Unknown error reading local folders';
    console.error('[local-folders API] Returning error response:', errorMessage);
    return error(errorMessage, 500);
  }
}
