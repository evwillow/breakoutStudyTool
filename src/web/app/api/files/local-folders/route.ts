import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Local Folders API Route
 * 
 * Serves folder data from the local data-processing directory
 * instead of Google Drive API.
 */

interface LocalFolder {
  id: string;
  name: string;
  files: Array<{
    id: string;
    name: string;
    fileName: string;
    mimeType: string;
    size: number;
    createdTime: string;
    modifiedTime: string;
  }>;
}

export async function GET(req: NextRequest) {
  try {
    const dataPath = path.join(process.cwd(), '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts');
    
    // Check if directory exists
    try {
      await fs.access(dataPath);
    } catch (error) {
      console.error('Data directory not found:', dataPath);
      return NextResponse.json({
        success: false,
        message: 'Data directory not found',
        error: 'Data directory does not exist'
      }, { status: 404 });
    }

    // Read all JSON files in the directory
    const files = await fs.readdir(dataPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // Group files by date (assuming filename format like YYYY-MM-DD_*.json)
    const foldersMap = new Map<string, LocalFolder>();

    for (const fileName of jsonFiles) {
      try {
        // Extract date from filename (assuming format: YYYY-MM-DD_*.json)
        const dateMatch = fileName.match(/^(\d{4}-\d{2}-\d{2})/);
        const folderName = dateMatch ? dateMatch[1] : 'Unknown';
        
        const filePath = path.join(dataPath, fileName);
        const stats = await fs.stat(filePath);
        
        if (!foldersMap.has(folderName)) {
          foldersMap.set(folderName, {
            id: folderName,
            name: folderName,
            files: []
          });
        }

        const folder = foldersMap.get(folderName)!;
        folder.files.push({
          id: fileName,
          name: fileName.replace('.json', ''),
          fileName: fileName,
          mimeType: 'application/json',
          size: stats.size,
          createdTime: stats.birthtime.toISOString(),
          modifiedTime: stats.mtime.toISOString()
        });
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
        // Continue with other files
      }
    }

    // Convert map to array and sort by date (newest first)
    const folders = Array.from(foldersMap.values()).sort((a, b) => 
      new Date(b.name).getTime() - new Date(a.name).getTime()
    );

    console.log(`Found ${folders.length} folders with ${jsonFiles.length} total files`);

    return NextResponse.json({
      success: true,
      folders: folders,
      totalFiles: jsonFiles.length
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
