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
    console.error('Error reading local folders:', error);
    return NextResponse.json({
      success: false,
      message: 'Error reading local data',
      error: error.message
    }, { status: 500 });
  }
}
