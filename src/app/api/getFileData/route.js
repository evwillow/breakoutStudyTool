// /src/app/api/getFileData/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { initializeDriveClient, getParentFolderId } from "@/lib/googleDrive";

export async function GET(request) {
  try {
    const selectedFolderName = new URL(request.url).searchParams.get("folder");
    if (!selectedFolderName) {
      return NextResponse.json({ error: "No folder selected" }, { status: 400 });
    }

    // Use the googleDrive utility to initialize the client and get parent folder ID
    const drive = await initializeDriveClient();
    const PARENT_FOLDER_ID = getParentFolderId();

    console.log(`Fetching data for folder: ${selectedFolderName} from parent: ${PARENT_FOLDER_ID}`);

    // Find the selected folder
    const folderResponse = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${selectedFolderName}'`,
      fields: "files(id, name)",
      pageSize: 1,
    });
    
    // If folder doesn't exist, return empty array instead of 404
    if (!folderResponse.data.files.length) {
      console.log(`Folder not found: ${selectedFolderName}, returning empty array`);
      return NextResponse.json([], {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }
    
    const selectedFolderId = folderResponse.data.files[0].id;

    // First, check for JSON files directly in the selected folder
    const directJsonResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and mimeType = 'application/json'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });
    
    const directJsonFiles = await Promise.all(
      directJsonResponse.data.files.map(async (file) => {
        try {
          const jsonData = await drive.files.get({
            fileId: file.id,
            alt: "media",
          });
          return {
            fileName: file.name,
            data: jsonData.data,
          };
        } catch (error) {
          console.error(`Error fetching JSON file ${file.name}:`, error.message);
          return {
            fileName: file.name,
            data: null,
            error: error.message
          };
        }
      })
    );
    
    // If we found JSON files directly in the folder, return them
    if (directJsonFiles.length > 0) {
      return NextResponse.json([
        {
          name: selectedFolderName,
          folderName: selectedFolderName,
          jsonFiles: directJsonFiles
        }
      ], {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    // Get all subfolders
    const subfolderResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });
    
    // If no subfolders and no direct JSON files, return empty array
    if (!subfolderResponse.data.files.length) {
      console.log(`No subfolders or JSON files found in folder: ${selectedFolderName}`);
      return NextResponse.json([], {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    // For each subfolder, fetch all JSON files
    const flashcards = await Promise.all(
      subfolderResponse.data.files.map(async (folder) => {
        const fileResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType = 'application/json'`,
          fields: "files(id, name)",
          pageSize: 1000,
        });
        const jsonFiles = await Promise.all(
          fileResponse.data.files.map(async (file) => {
            try {
              const jsonData = await drive.files.get({
                fileId: file.id,
                alt: "media",
              });
              return {
                fileName: file.name,
                data: jsonData.data,
              };
            } catch (error) {
              console.error(`Error fetching JSON file ${file.name}:`, error.message);
              return {
                fileName: file.name,
                data: null,
                error: error.message
              };
            }
          })
        );
        return {
          name: folder.name, // Add name property to match expected format
          folderName: folder.name,
          jsonFiles,
        };
      })
    );

    return NextResponse.json(flashcards, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Error fetching files:", error.message, error.stack);
    // Return empty array instead of error
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
}
