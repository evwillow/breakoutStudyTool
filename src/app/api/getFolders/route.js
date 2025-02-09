import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

export async function GET() {
  try {
    const keyFilePath = path.join(process.cwd(), "src", "config", "service-account.json");

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });

    const parentFolderId = "18q55oXvsOL2MboehLA1OglGdepBVDDub"; // Main Google Drive folder ID

    // 🔥 List all top-level folders
    const folderResponse = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
    });

    if (!folderResponse.data.files.length) {
      return NextResponse.json({ error: "No folders found" }, { status: 404 });
    }

    // 🔥 Return all available folders
    const folders = folderResponse.data.files.map(folder => ({
      id: folder.id,
      name: folder.name,
    }));

    return NextResponse.json(folders, { status: 200 });
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json({ error: "Failed to fetch folders", details: error.message }, { status: 500 });
  }
}
