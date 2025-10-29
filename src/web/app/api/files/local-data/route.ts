import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

    // fileName format: "STOCK_DIR/JSON_FILE" (e.g., "AAL_Dec_11_2006/after.json")
    const filePath = path.join(process.cwd(), '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts', fileName);

    // Security check - ensure the file is within the expected directory
    const expectedDir = path.join(process.cwd(), '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts');
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(expectedDir);
    
    if (!resolvedPath.startsWith(resolvedDir)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid file path'
      }, { status: 400 });
    }

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      return NextResponse.json({
        success: true,
        data: jsonData,
        fileName: fileName,
        folder: folder
      });

    } catch (fileError: any) {
      console.error(`Error reading file ${fileName}:`, fileError);
      return NextResponse.json({
        success: false,
        message: 'Error reading file',
        error: fileError.message
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error in local data API:', error);
    return NextResponse.json({
      success: false,
      message: 'Error processing request',
      error: error.message
    }, { status: 500 });
  }
}
