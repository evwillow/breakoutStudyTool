/**
 * @fileoverview Returns specific dataset JSON files for flashcard charts.
 * @module src/web/app/api/files/local-data/route.ts
 * @dependencies next/server, node:path, node:fs/promises
 */
import { NextResponse } from 'next/server';
import { getFileData } from '@/lib/cache/localDataCache';

/**
 * Local Data API Route
 * 
 * Serves individual JSON files from the local data-processing directory.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file');
    const folder = searchParams.get('folder');

    if (!fileName || !folder) {
      return NextResponse.json({
        success: false,
        message: 'Missing file or folder parameter'
      }, { status: 400 });
    }

    const jsonData = await getFileData(fileName);

    const response = NextResponse.json({
      success: true,
      data: jsonData,
      fileName: fileName,
      folder: folder
    });
    
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    
    return response;
  } catch (error: any) {
    console.error('Error in local data API:', error);
    return NextResponse.json({
      success: false,
      message: 'Error processing request',
      error: error.message
    }, { status: 500 });
  }
}
