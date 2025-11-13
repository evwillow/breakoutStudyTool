/**
 * @fileoverview Returns specific dataset JSON files for flashcard charts.
 * @module src/web/app/api/files/local-data/route.ts
 * @dependencies next/server, node:path, node:fs/promises
 */
import { NextRequest, NextResponse } from 'next/server';
import { success, error } from '@/lib/api/responseHelpers';
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
      return error('Missing file or folder parameter', 400);
    }

    const jsonData = await fetchLocalFile({ fileName });

    const baseResponse = success({
      data: jsonData,
      fileName,
      folder
    });

    const response = NextResponse.from(baseResponse);
    response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return response;
  } catch (error: any) {
    console.error('Error in local data API:', error);
    return error('Error processing request', 500);
  }
}
