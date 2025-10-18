/**
 * Google Drive Service Account Utility
 * 
 * Securely loads Google Drive credentials from environment variables
 * instead of using a service account JSON file.
 */
import { google } from "googleapis";

let authClient = null;
let drive = null;

/**
 * Creates a service account credentials object from environment variables
 * This avoids storing sensitive credentials in files
 */
function getServiceAccountCredentials() {
  // Validate environment variables
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ||
      !process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID) {
    if (process.env.NODE_ENV !== 'production') {
      // Return a dummy object; subsequent calls should be guarded by env middleware
      return {
        type: "service_account",
        project_id: "missing",
        private_key_id: "missing",
        private_key: "missing",
        client_email: "missing",
        client_id: "missing",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/missing",
        universe_domain: "googleapis.com"
      };
    }
    throw new Error("Missing Google Service Account credentials in environment variables");
  }

  // Create credentials object in the same format as the JSON file
  return {
    type: "service_account",
    project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
    private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(
      process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL
    )}`,
    universe_domain: "googleapis.com"
  };
}

/**
 * Initializes Google Drive client using environment variables
 * Caches the client for reuse
 */
export async function initializeDriveClient() {
  if (!authClient) {
    try {
      // Create auth client with credentials from environment variables
      authClient = new google.auth.GoogleAuth({
        credentials: getServiceAccountCredentials(),
        scopes: ["https://www.googleapis.com/auth/drive.readonly"],
      });
      
      // Initialize drive client
      drive = google.drive({ version: "v3", auth: authClient });
    } catch (error) {
      console.error("Error initializing Google Drive client:", error.message);
      if (process.env.NODE_ENV !== 'production') {
        // Provide a proxy that throws on usage for clearer DX without crashing importers
        return new Proxy({}, {
          get() { throw new Error("Google Drive not configured. Set GOOGLE_SERVICE_ACCOUNT_* env vars."); }
        });
      }
      throw new Error("Failed to initialize Google Drive client. Check your environment variables.");
    }
  }
  
  return drive;
}

/**
 * Gets the parent folder ID for Google Drive operations
 */
export function getParentFolderId() {
  if (!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    if (process.env.NODE_ENV !== 'production') {
      return 'missing';
    }
    throw new Error("Missing GOOGLE_DRIVE_PARENT_FOLDER_ID environment variable");
  }
  
  return process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;
}

/**
 * Lists all files in a folder
 */
export async function listFiles(folderId, mimeType, pageSize = 1000) {
  const drive = await initializeDriveClient();
  
  let query = `'${folderId}' in parents`;
  if (mimeType) {
    query += ` and mimeType = '${mimeType}'`;
  }
  
  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType)",
    pageSize,
  });
  
  return response.data.files;
}

/**
 * Gets the content of a file
 */
export async function getFileContent(fileId) {
  const drive = await initializeDriveClient();
  
  const response = await drive.files.get({
    fileId,
    alt: "media",
  });
  
  return response.data;
} 