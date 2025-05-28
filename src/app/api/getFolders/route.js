import { NextResponse } from "next/server";
import { initializeDriveClient, getParentFolderId, listFiles } from "@/lib/googleDrive";

// Cache results for improved performance
let cachedFolders = null;
let cacheTime = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET() {
  try {
    // Return cached data if available and not expired
    if (cachedFolders && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
      return NextResponse.json(cachedFolders, {
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT'
        }
      });
    }

    console.log("Fetching folders from Google Drive...");
    
    // Check environment variables before proceeding
    const requiredEnvVars = [
      'GOOGLE_SERVICE_ACCOUNT_PROJECT_ID',
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
      'GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL',
      'GOOGLE_DRIVE_PARENT_FOLDER_ID'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error("Missing environment variables:", missingVars);
      return NextResponse.json(
        { 
          error: "Missing required environment variables", 
          missingVariables: missingVars,
          details: "Please check your environment configuration"
        },
        { status: 500 }
      );
    }
    
    // Get the drive client and parent folder ID
    const drive = await initializeDriveClient();
    const parentFolderId = getParentFolderId();
    
    // Get folders
    const foldersResponse = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });

    const folders = foldersResponse.data.files;
    
    // Shuffle the folders array to randomize the order
    const shuffleFolders = (array) => {
      // Fisher-Yates shuffle algorithm
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    };
    
    // Apply the shuffle to randomize folder order
    const shuffledFolders = shuffleFolders([...folders]);
    console.log('Folders have been randomly shuffled in API response');
    
    // Update cache
    cachedFolders = shuffledFolders;
    cacheTime = Date.now();
    
    // Return data with cache headers
    return NextResponse.json(shuffledFolders, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error("Error fetching folders:", error);
    
    // Provide more specific error information
    let errorDetails = error.message;
    if (error.code === 'ENOTFOUND') {
      errorDetails = "Network connection error - check internet connectivity";
    } else if (error.message.includes('credentials')) {
      errorDetails = "Google Drive authentication failed - check service account credentials";
    } else if (error.message.includes('permission')) {
      errorDetails = "Permission denied - check Google Drive folder permissions";
    }
    
    return NextResponse.json(
      { 
        error: "Failed to fetch folders", 
        details: errorDetails,
        errorCode: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}