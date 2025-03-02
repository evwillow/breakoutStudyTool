// /src/app/api/getFileData/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

let authClient = null;
let drive = null;

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

export async function GET(request) {
  try {
    const selectedFolderName = new URL(request.url).searchParams.get("folder");
    if (!selectedFolderName) {
      return NextResponse.json({ error: "No folder selected" }, { status: 400 });
    }

    const drive = await initializeAuth();

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

    // First, check for CSV files directly in the selected folder
    const directCsvResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and mimeType = 'text/csv'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });
    
    const directCsvFiles = await Promise.all(
      directCsvResponse.data.files.map(async (file) => {
        try {
          const csvData = await drive.files.get({
            fileId: file.id,
            alt: "media",
          });
          return {
            fileName: file.name,
            data: csvData.data,
          };
        } catch (error) {
          console.error(`Error fetching CSV file ${file.name}:`, error.message);
          return {
            fileName: file.name,
            data: null,
            error: error.message
          };
        }
      })
    );
    
    // If we found CSV files directly in the folder, return them
    if (directCsvFiles.length > 0) {
      return NextResponse.json([
        {
          folderName: selectedFolderName,
          csvFiles: directCsvFiles
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
    
    // If no subfolders and no direct CSV files, return empty array
    if (!subfolderResponse.data.files.length) {
      console.log(`No subfolders or CSV files found in folder: ${selectedFolderName}`);
      return NextResponse.json([], {
        status: 200,
        headers: { "Cache-Control": "public, max-age=300" },
      });
    }

    // For each subfolder, fetch all CSV files
    const flashcards = await Promise.all(
      subfolderResponse.data.files.map(async (folder) => {
        const fileResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType = 'text/csv'`,
          fields: "files(id, name)",
          pageSize: 1000,
        });
        const csvFiles = await Promise.all(
          fileResponse.data.files.map(async (file) => {
            try {
              const csvData = await drive.files.get({
                fileId: file.id,
                alt: "media",
              });
              return {
                fileName: file.name,
                data: csvData.data,
              };
            } catch (error) {
              console.error(`Error fetching CSV file ${file.name}:`, error.message);
              return {
                fileName: file.name,
                data: null,
                error: error.message
              };
            }
          })
        );
        return {
          folderName: folder.name,
          csvFiles,
        };
      })
    );

    return NextResponse.json(flashcards, {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    console.error("Error fetching files:", error.message);
    // Return empty array instead of error
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }
}
