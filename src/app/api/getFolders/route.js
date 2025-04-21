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
    
    // Update cache
    cachedFolders = folders;
    cacheTime = Date.now();
    
    // Return data with cache headers
    return NextResponse.json(folders, {
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error("Error fetching folders:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch folders", details: error.message },
      { status: 500 }
    );
  }
}