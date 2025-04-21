import { NextResponse } from "next/server";
import { initializeDriveClient, getParentFolderId } from "@/lib/googleDrive";

export async function GET() {
  try {
    // Test environment variables
    const envTest = {
      GOOGLE_API_KEY: !!process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY,
      SERVICE_ACCOUNT_PROJECT_ID: !!process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
      SERVICE_ACCOUNT_PRIVATE_KEY_ID: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      SERVICE_ACCOUNT_PRIVATE_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      SERVICE_ACCOUNT_CLIENT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
      SERVICE_ACCOUNT_CLIENT_ID: !!process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
      PARENT_FOLDER_ID: !!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
    };

    let driveTest = { status: "pending" };
    let parentFolder = null;
    let folders = [];
    
    try {
      // Initialize Drive client
      const drive = await initializeDriveClient();
      driveTest.status = "initialized";
      
      // Get parent folder ID
      const parentFolderId = getParentFolderId();
      driveTest.parentFolderId = parentFolderId;
      
      // Verify parent folder exists
      const folderResponse = await drive.files.get({
        fileId: parentFolderId,
        fields: "id,name"
      });
      
      parentFolder = folderResponse.data;
      driveTest.status = "folder_verified";
      
      // List subfolders
      const subfoldersResponse = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
        fields: "files(id, name)",
        pageSize: 10,
      });
      
      folders = subfoldersResponse.data.files;
      driveTest.status = "success";
      driveTest.folderCount = folders.length;
      
      // Check first folder for files if folders exist
      if (folders.length > 0) {
        const firstFolderId = folders[0].id;
        const filesResponse = await drive.files.list({
          q: `'${firstFolderId}' in parents and mimeType = 'application/json'`,
          fields: "files(id, name)",
          pageSize: 10,
        });
        
        driveTest.firstFolderFiles = filesResponse.data.files.map(f => f.name);
        driveTest.hasJsonFiles = filesResponse.data.files.length > 0;
      }
    } catch (error) {
      driveTest.status = "error";
      driveTest.error = error.message;
      driveTest.stack = error.stack;
    }

    return NextResponse.json({
      status: "success",
      timestamp: new Date().toISOString(),
      environmentVariables: envTest,
      driveTest,
      parentFolder,
      folders: folders.slice(0, 5), // Just show first 5 folders
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 