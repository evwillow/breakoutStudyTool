// src/app/api/getImages/route.js
import { google } from "googleapis";
import { NextResponse } from "next/server";
import path from "path";

export async function GET(request) {
  console.log('GET request received for getImages');
  try {
    const url = new URL(request.url);
    const selectedFolderName = url.searchParams.get("folder");
    console.log('Selected folder:', selectedFolderName);

    if (!selectedFolderName) {
      console.log('No folder selected');
      return NextResponse.json({ error: "No folder selected" }, { status: 400 });
    }

    const keyFilePath = path.join(process.cwd(), "src", "config", "service-account.json");
    console.log('Key file path:', keyFilePath);

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth });

    const parentFolderId = "18q55oXvsOL2MboehLA1OglGdepBVDDub";
    console.log('Parent folder ID:', parentFolderId);

    // Find the selected folder
    console.log(`Searching for folder: ${selectedFolderName}`);
    const folderResponse = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${selectedFolderName}'`,
      fields: "files(id, name)",
    });

    console.log('Folder search response:', folderResponse.data);

    if (!folderResponse.data.files.length) {
      console.log(`Folder '${selectedFolderName}' not found`);
      return NextResponse.json({ error: `Folder '${selectedFolderName}' not found` }, { status: 404 });
    }

    const selectedFolderId = folderResponse.data.files[0].id;
    console.log('Selected folder ID:', selectedFolderId);

    // Get all subfolders directly inside the selected folder
    console.log('Getting subfolders');
    const subfolderResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
    });

    console.log('Subfolder response:', subfolderResponse.data);

    if (!subfolderResponse.data.files.length) {
      console.log('No subfolders found');
      return NextResponse.json({ error: "No subfolders found in selected folder" }, { status: 404 });
    }

    const flashcards = [];

    // Fetch images from each subfolder
    for (const folder of subfolderResponse.data.files) {
      console.log(`Fetching images from subfolder: ${folder.name}`);
      const imageResponse = await drive.files.list({
        q: `'${folder.id}' in parents and mimeType contains 'image/'`,
        fields: "files(id, name)",
      });

      console.log(`Found ${imageResponse.data.files.length} images in ${folder.name}`);

      const images = imageResponse.data.files.map(file => ({
        id: file.id,
        url: `https://lh3.googleusercontent.com/d/${file.id}`,
      }));

      if (images.length > 0) {
        flashcards.push({
          folderName: folder.name,
          images: images.slice(0, 3), // Get first 3 images
        });
      }
    }

    console.log('Returning flashcards:', flashcards);
    return NextResponse.json(flashcards, { status: 200 });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json({ 
      error: "Failed to fetch images", 
      details: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}