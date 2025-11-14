/**
 * @fileoverview Returns specific dataset JSON files for flashcard charts.
 * @module src/web/app/api/files/local-data/route.ts
 * @dependencies next/server, node:path, node:fs/promises
 */
import { NextRequest, NextResponse } from 'next/server';
import { fetchLocalFile } from '@/services/flashcard/flashcardService';

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
      return NextResponse.json(
        { success: false, error: 'Missing file or folder parameter' },
        { status: 400 }
      );
    }

    const jsonData = await fetchLocalFile({ fileName });

    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[local-data API] Serving file: ${fileName}`, {
        hasData: jsonData !== null && jsonData !== undefined,
        isArray: Array.isArray(jsonData),
        dataLength: Array.isArray(jsonData) ? jsonData.length : 'N/A',
        dataType: typeof jsonData,
      });
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          data: jsonData,
          fileName,
          folder
        }
      },
      {
        status: 200,
        headers: {
          // Aggressive caching - files rarely change
          'Cache-Control': 'public, max-age=7200, s-maxage=7200, stale-while-revalidate=86400'
        }
      }
    );
    return response;
  } catch (err: any) {
    console.error('Error in local data API:', err);
    return NextResponse.json(
      { success: false, error: 'Error processing request' },
      { status: 500 }
    );
  }
}
