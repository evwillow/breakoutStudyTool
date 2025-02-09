import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const selectedFolderName = url.searchParams.get("folder");

    if (!selectedFolderName) {
      return NextResponse.json({ error: "No folder selected" }, { status: 400 });
    }

    const keyFilePath = path.join(process.cwd(), "src", "config", "service-account.json");
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });
    const parentFolderId = "18q55oXvsOL2MboehLA1OglGdepBVDDub";

    // Find the selected folder
    const folderResponse = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${selectedFolderName}'`,
      fields: "files(id, name)",
    });

    if (!folderResponse.data.files.length) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const selectedFolderId = folderResponse.data.files[0].id;

    // Get all subfolders
    const subfolderResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
    });

    if (!subfolderResponse.data.files.length) {
      return NextResponse.json({ error: "No subfolders found" }, { status: 404 });
    }

    const flashcards = [];

    // For each subfolder, get all CSV files
    for (const folder of subfolderResponse.data.files) {
      const fileResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType = 'text/csv'`,
        fields: "files(id, name)",
      });

      const csvFiles = [];
      for (const file of fileResponse.data.files) {
        const csvData = await drive.files.get({
          fileId: file.id,
          alt: 'media'
        });
        csvFiles.push({
          fileName: file.name,
          data: csvData.data
        });
      }

      flashcards.push({
        folderName: folder.name,
        csvFiles: csvFiles
      });
    }

    return NextResponse.json(flashcards, { status: 200 });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}