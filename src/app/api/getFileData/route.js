import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

// Cache auth client
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
const BATCH_SIZE = 10; // Number of parallel requests

// Helper function to batch process array items
async function processBatch(items, processItem) {
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(processItem));
    results.push(...batchResults);
  }
  return results;
}

export async function GET(request) {
  try {
    // Get and validate folder name
    const selectedFolderName = new URL(request.url).searchParams.get("folder");
    if (!selectedFolderName) {
      return NextResponse.json({ error: "No folder selected" }, { status: 400 });
    }

    // Initialize Drive API
    const drive = await initializeAuth();

    // Find selected folder - use more specific query
    const folderResponse = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and 
          mimeType = 'application/vnd.google-apps.folder' and 
          name = '${selectedFolderName}'`,
      fields: "files(id, name)",
      pageSize: 1
    });

    if (!folderResponse.data.files.length) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const selectedFolderId = folderResponse.data.files[0].id;

    // Get all subfolders in one query
    const subfolderResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and 
          mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000
    });

    if (!subfolderResponse.data.files.length) {
      return NextResponse.json({ error: "No subfolders found" }, { status: 404 });
    }

    // Process subfolders in parallel batches
    const flashcards = await processBatch(subfolderResponse.data.files, async (folder) => {
      // Get all CSV files for this subfolder
      const fileResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType = 'text/csv'`,
        fields: "files(id, name)",
        pageSize: 1000
      });

      // Process CSV files in parallel
      const csvFiles = await processBatch(fileResponse.data.files, async (file) => {
        const csvData = await drive.files.get({
          fileId: file.id,
          alt: 'media',
          fields: "id,name,size",  // Request only needed fields
        });

        return {
          fileName: file.name,
          data: csvData.data
        };
      });

      return {
        folderName: folder.name,
        csvFiles
      };
    });

    return NextResponse.json(flashcards, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
      }
    });

  } catch (error) {
    console.error("Error fetching files:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch files" }, 
      { status: error.code === 404 ? 404 : 500 }
    );
  }
}