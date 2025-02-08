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

    const folderId = "18q55oXvsOL2MboehLA1OglGdepBVDDub";

    // Fetch image files from Google Drive
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/'`,
      fields: "files(id, name, webViewLink, webContentLink)",
    });

    if (!response.data.files.length) {
      return NextResponse.json({ error: "No images found" }, { status: 404 });
    }

    // Generate correct Google Drive image links
    const images = response.data.files.map(file => ({
      id: file.id,
      url: `https://lh3.googleusercontent.com/d/${file.id}`, // ✅ Ensuring correct format
    }));

    return NextResponse.json(images, { status: 200 });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json({ error: "Failed to fetch images", details: error.message }, { status: 500 });
  }
}
