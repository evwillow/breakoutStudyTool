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

// Parent folder ID matching what's used in the app
const PARENT_FOLDER_ID = "18q55oXvsOL2MboehLA1OglGdepBVDDub";

export async function GET(request) {
  try {
    console.log("Testing Google Drive access...");
    
    // Step 1: Initialize authentication
    console.log("Initializing Google Drive auth...");
    const drive = await initializeAuth();
    console.log("Drive auth initialized successfully");
    
    // Step 2: Check if we can access the parent folder
    console.log(`Checking access to parent folder: ${PARENT_FOLDER_ID}`);
    const parentFolderResponse = await drive.files.get({
      fileId: PARENT_FOLDER_ID,
      fields: "id,name,mimeType"
    });
    
    console.log("Successfully accessed parent folder:", parentFolderResponse.data);
    
    // Step 3: List all top-level folders
    console.log("Listing top-level folders...");
    const foldersResponse = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 1000,
    });
    
    if (!foldersResponse.data.files.length) {
      console.log("No folders found in parent folder");
      return NextResponse.json({
        status: "warning",
        message: "No folders found in the specified parent folder",
        parentFolder: parentFolderResponse.data
      });
    }
    
    console.log(`Found ${foldersResponse.data.files.length} folders in parent folder`);
    
    // Step 4: Check first folder for contents
    const firstFolder = foldersResponse.data.files[0];
    console.log(`Checking first folder: ${firstFolder.name} (${firstFolder.id})`);
    
    // Check for JSON files directly in the folder
    const directJsonResponse = await drive.files.list({
      q: `'${firstFolder.id}' in parents and mimeType = 'application/json'`,
      fields: "files(id, name)",
      pageSize: 10,
    });
    
    // Check for subfolders
    const subFoldersResponse = await drive.files.list({
      q: `'${firstFolder.id}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: 10,
    });
    
    // Return success with diagnostics
    return NextResponse.json({
      status: "success",
      message: "Google Drive access is working correctly",
      diagnostics: {
        parentFolder: parentFolderResponse.data,
        folderCount: foldersResponse.data.files.length,
        folders: foldersResponse.data.files.slice(0, 5), // Show first 5 folders
        firstFolderDetails: {
          folder: firstFolder,
          directJsonCount: directJsonResponse.data.files.length,
          directJsonFiles: directJsonResponse.data.files.slice(0, 5), // Show first 5 JSON files
          subFolderCount: subFoldersResponse.data.files.length,
          subFolders: subFoldersResponse.data.files.slice(0, 5) // Show first 5 subfolders
        }
      }
    });
    
  } catch (error) {
    console.error("Google Drive access test failed:", error);
    
    // Determine the type of error
    let errorType = "unknown";
    let solution = "Check the service account credentials and permissions";
    
    if (error.code === 404) {
      errorType = "not_found";
      solution = "The parent folder ID is invalid or the service account doesn't have access to it";
    } else if (error.code === 403) {
      errorType = "permission_denied";
      solution = "The service account doesn't have permission to access the folder";
    } else if (error.message && error.message.includes("invalid_grant")) {
      errorType = "invalid_credentials";
      solution = "The service account credentials are invalid or expired";
    }
    
    return NextResponse.json({
      status: "error",
      message: "Google Drive access test failed",
      error: {
        type: errorType,
        code: error.code,
        message: error.message
      },
      solution
    }, { status: 500 });
  }
} 