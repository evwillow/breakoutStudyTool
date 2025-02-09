import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

// Cache auth client and drive instance
let authClient = null;
let drive = null;

// Initialize auth once
const initializeAuth = async () => {
  if (!authClient) {
    const keyFilePath = path.join(process.cwd(), "src", "config", "service-account.json");
    authClient = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
    drive = google.drive({ version: "v3", auth: authClient });
  }
  return drive;
};

const PARENT_FOLDER_ID = "18q55oXvsOL2MboehLA1OglGdepBVDDub";

// Cache folders response
let cachedFolders = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function GET() {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedFolders && (now - lastFetchTime < CACHE_DURATION)) {
      return NextResponse.json(cachedFolders, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    // Initialize Drive API
    const drive = await initializeAuth();

    // Optimized query with specific fields and pageSize
    const response = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and 
          mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
      orderBy: 'name'
    });

    if (!response.data.files.length) {
      return NextResponse.json(
        { error: "No folders found" }, 
        { status: 404 }
      );
    }

    // Map folders once and cache result
    cachedFolders = Object.freeze(
      response.data.files.map(({ id, name }) => ({ id, name }))
    );
    lastFetchTime = now;

    return NextResponse.json(cachedFolders, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'ETag': `"${lastFetchTime}"` // Add ETag for caching
      }
    });

  } catch (error) {
    console.error("Error fetching folders:", error.message);
    
    // Return cached data on error if available
    if (cachedFolders) {
      return NextResponse.json(cachedFolders, {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300',
          'X-Served-From-Cache': 'true'
        }
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch folders" }, 
      { status: error.code === 404 ? 404 : 500 }
    );
  }
}