import { NextRequest, NextResponse } from 'next/server';
import { getFolderIndex } from '@/lib/cache/localDataCache';

/**
 * Local Folders API Route
 * 
 * Serves folder data from the local data-processing directory
 * instead of Google Drive API.
 */

export async function GET(_req: NextRequest) {
  try {
    const folders = await getFolderIndex();

    return NextResponse.json({
      success: true,
      folders: folders,
      totalFiles: folders.reduce((count, folder) => count + folder.files.length, 0)
    });

  } catch (error: any) {
    console.error('[local-folders API] Error reading local folders:', error);
    console.error('[local-folders API] Error type:', typeof error);
    console.error('[local-folders API] Error keys:', error ? Object.keys(error) : 'null');
    
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    const errorStack = error?.stack || '';
    
    return NextResponse.json({
      success: false,
      message: 'Error reading local data',
      error: errorMessage,
      errorType: typeof error,
      details: process.env.NODE_ENV === 'development' ? {
        stack: errorStack,
        fullError: String(error)
      } : undefined
    }, { status: 500 });
  }
}
