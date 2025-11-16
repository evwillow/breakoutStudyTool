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
    const result = await fetchLocalFolders();
    
    if (!result) {
      console.error('[local-folders API] fetchLocalFolders returned null/undefined');
      return error('Failed to fetch folders: no result returned', 500);
    }
    
    if (!result.folders) {
      console.error('[local-folders API] fetchLocalFolders result missing folders property');
      return error('Failed to fetch folders: missing folders property', 500);
    }
    
    if (!Array.isArray(result.folders)) {
      console.error('[local-folders API] folders is not an array');
      return error('Failed to fetch folders: folders is not an array', 500);
    }
    
    const responseData = { folders: result.folders, totalFiles: result.totalFiles };
    
    const response = success(responseData);
    // Add aggressive caching - folders don't change often
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (err: any) {
    const errorMessage = err?.message || err?.toString() || 'Unknown error reading local folders';
    console.error('[local-folders API] Error:', errorMessage);
    return error(errorMessage, 500);
  }
}
