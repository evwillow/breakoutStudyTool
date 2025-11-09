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

    // Try multiple possible paths (same as local-folders route)
    const possibleBasePaths = [
      path.join(process.cwd(), 'src', 'data-processing', 'ds', 'quality_breakouts'),
      path.join(process.cwd(), '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts'),
      path.join(__dirname, '..', '..', '..', '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts'),
      '/var/www/html/breakoutStudyTool/src/data-processing/ds/quality_breakouts'
    ];
    
    // fileName format: "STOCK_DIR/JSON_FILE" (e.g., "AAL_Dec_11_2006/after.json")
    let dataPath = null;
    let filePath = null;
    
    for (const basePath of possibleBasePaths) {
      try {
        const testPath = path.join(basePath, fileName);
        await fs.access(testPath);
        dataPath = basePath;
        filePath = testPath;
        break;
      } catch (error) {
        continue;
      }
    }
    
    if (!filePath || !dataPath) {
      return NextResponse.json({
        success: false,
        message: 'File not found',
        error: `Could not locate file: ${fileName}`
      }, { status: 404 });
    }

    // Security check - ensure the file is within the expected directory
    const resolvedPath = path.resolve(filePath);
    const resolvedDir = path.resolve(dataPath);
    
    if (!resolvedPath.startsWith(resolvedDir)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid file path'
      }, { status: 400 });
    }

    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);

      const response = NextResponse.json({
        success: true,
        data: jsonData,
        fileName: fileName,
        folder: folder
      });
      
      // Add caching headers for better performance
      response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
      
      return response;

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
