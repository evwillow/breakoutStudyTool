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

    // Read all directories (each represents a stock breakout)
    const entries = await fs.readdir(dataPath, { withFileTypes: true });
    const stockDirectories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    // Group by date (extract date from directory names like AAL_Dec_11_2006)
    const foldersMap = new Map<string, LocalFolder>();

    for (const stockDir of stockDirectories) {
      try {
        // Extract date from directory name (format: SYMBOL_Month_Day_Year)
        const dateMatch = stockDir.match(/_(\w+)_(\d+)_(\d+)$/);
        if (!dateMatch) continue;
        
        const [, month, day, year] = dateMatch;
        const monthMap: { [key: string]: string } = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        };
        
        const monthNum = monthMap[month];
        if (!monthNum) continue;
        
        const folderName = `${year}-${monthNum}-${day.padStart(2, '0')}`;
        
        const stockDirPath = path.join(dataPath, stockDir);
        const files = await fs.readdir(stockDirPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        if (!foldersMap.has(folderName)) {
          foldersMap.set(folderName, {
            id: folderName,
            name: folderName,
            files: []
          });
        }

        const folder = foldersMap.get(folderName)!;
        
        // Add each stock breakout as a "file" in the folder
        for (const jsonFile of jsonFiles) {
          const filePath = path.join(stockDirPath, jsonFile);
          const stats = await fs.stat(filePath);
          
          folder.files.push({
            id: `${stockDir}_${jsonFile}`,
            name: `${stockDir}_${jsonFile.replace('.json', '')}`,
            fileName: `${stockDir}/${jsonFile}`,
            mimeType: 'application/json',
            size: stats.size,
            createdTime: stats.birthtime.toISOString(),
            modifiedTime: stats.mtime.toISOString()
          });
        }
      } catch (error) {
        console.error(`Error processing directory ${stockDir}:`, error);
        // Continue with other directories
      }
    }

    // Convert map to array and sort by date (newest first)
    const folders = Array.from(foldersMap.values()).sort((a, b) => 
      new Date(b.name).getTime() - new Date(a.name).getTime()
    );

    console.log(`Found ${folders.length} date folders with ${stockDirectories.length} stock breakouts`);

    return NextResponse.json({
      success: true,
      folders: folders,
      totalFiles: stockDirectories.length
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
