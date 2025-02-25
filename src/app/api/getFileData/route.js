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
    if (!folderResponse.data.files.length) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    const selectedFolderId = folderResponse.data.files[0].id;

    // Get all subfolders (flashcards)
    const subfolderResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });
    if (!subfolderResponse.data.files.length) {
      return NextResponse.json({ error: "No subfolders found" }, { status: 404 });
    }

    // For each subfolder, fetch all CSV files (this includes thing.csv, along with others like D.csv, H.csv, M.csv, etc.)
    const flashcards = await Promise.all(
      subfolderResponse.data.files.map(async (folder) => {
        const fileResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType = 'text/csv'`,
          fields: "files(id, name)",
          pageSize: 1000,
        });
        const csvFiles = await Promise.all(
          fileResponse.data.files.map(async (file) => {
            const csvData = await drive.files.get({
              fileId: file.id,
              alt: "media",
            });
            return {
              fileName: file.name,
              data: csvData.data,
            };
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
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}
