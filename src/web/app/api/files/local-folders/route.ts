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
    // Try multiple possible paths
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'data-processing', 'ds', 'quality_breakouts'),
      path.join(process.cwd(), '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts'),
      path.join(__dirname, '..', '..', '..', '..', '..', 'src', 'data-processing', 'ds', 'quality_breakouts'),
      '/var/www/html/breakoutStudyTool/src/data-processing/ds/quality_breakouts'
    ];
    
    let dataPath = null;
    let foundPath = null;
    
    console.log('Current working directory:', process.cwd());
    console.log('__dirname:', __dirname);
    
    // Try each possible path
    for (const testPath of possiblePaths) {
      try {
        await fs.access(testPath);
        dataPath = testPath;
        foundPath = testPath;
        console.log('Data directory found at:', testPath);
        break;
      } catch (error) {
        console.log('Path not found:', testPath);
        continue;
      }
    }
    
    if (!dataPath) {
      console.error('Data directory not found in any of the expected locations');
      return NextResponse.json({
        success: false,
        message: 'Data directory not found',
        error: 'Data directory does not exist in any expected location',
        debug: {
          cwd: process.cwd(),
          __dirname: __dirname,
          triedPaths: possiblePaths
        }
      }, { status: 404 });
    }

    // Read all directories (each represents a stock breakout)
    // All stock breakouts belong to the single "quality_breakouts" dataset
    const entries = await fs.readdir(dataPath, { withFileTypes: true });
    const stockDirectories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    // Create a single folder for "quality_breakouts" dataset
    // Each stock directory will be represented as a "file" in this folder
    const qualityBreakoutsFolder: LocalFolder = {
      id: 'quality_breakouts',
      name: 'quality_breakouts',
      files: []
    };

    for (const stockDir of stockDirectories) {
      try {
        const stockDirPath = path.join(dataPath, stockDir);
        const files = await fs.readdir(stockDirPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        // Skip directories with no JSON files
        if (jsonFiles.length === 0) {
          console.log(`Skipping directory ${stockDir} - no JSON files found`);
          continue;
        }
        
        // Add each stock directory as a "file" entry
        // The fileName will be the directory name, which can be used to load all files in that directory
        for (const jsonFile of jsonFiles) {
          const filePath = path.join(stockDirPath, jsonFile);
          const stats = await fs.stat(filePath);
          
          // Use stockDir as the "name" and include jsonFile in the fileName
          qualityBreakoutsFolder.files.push({
            id: `${stockDir}_${jsonFile}`,
            name: stockDir, // Stock directory name (e.g., "AAL_Dec_11_2006")
            fileName: `${stockDir}/${jsonFile}`, // Full path relative to quality_breakouts
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

    // Return single folder
    const folders = [qualityBreakoutsFolder];

    console.log(`Found quality_breakouts dataset with ${stockDirectories.length} stock breakouts and ${qualityBreakoutsFolder.files.length} total files`);

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
