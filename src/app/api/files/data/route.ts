/**
 * Google Drive File Data API
 * 
 * Handles fetching file data from Google Drive folders
 */
import { NextRequest } from 'next/server';
import { createSuccessResponse, addCacheHeaders } from '../../_shared/utils/response';
import { withErrorHandling, withEnvironmentValidation, composeMiddleware } from '../../_shared/middleware/errorHandler';
import { initializeDriveClient, getParentFolderId } from '@/lib/googleDrive';
import { AppError, ErrorCodes, ValidationError } from '@/utils/errorHandling';

interface DriveFile {
  id?: string | null;
  name?: string | null;
}

interface FlashcardData {
  name: string;
  jsonFiles: Array<{
    fileName: string;
    data: any;
  }>;
}

/**
 * Get file data from a specific folder
 */
async function getFileData(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const selectedFolderName = searchParams.get('folder');
  const limit = parseInt(searchParams.get('limit') || '10'); // Limit number of subfolders
  const offset = parseInt(searchParams.get('offset') || '0'); // Offset for pagination

  if (!selectedFolderName) {
    throw new ValidationError(
      'Folder parameter is required',
      ErrorCodes.VALIDATION_REQUIRED_FIELD,
      400,
      {},
      'Please specify a folder name.'
    );
  }

  try {
    console.log(`Fetching data for folder: ${selectedFolderName}, limit: ${limit}, offset: ${offset}`);
    
    // Use the googleDrive utility to initialize the client and get parent folder ID
    const drive = await initializeDriveClient();
    const PARENT_FOLDER_ID = getParentFolderId();

    // Find the selected folder
    const folderResponse = await drive.files.list({
      q: `'${PARENT_FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${selectedFolderName}'`,
      fields: "files(id, name)",
      pageSize: 1,
    });
    
    // If folder doesn't exist, return empty array
    if (!folderResponse.data.files?.length) {
      const response = createSuccessResponse<FlashcardData[]>([]);
      return addCacheHeaders(response, 300);
    }
    
    const selectedFolderId = folderResponse.data.files[0].id!;

    // Get all subfolders with pagination
    const subfolderResponse = await drive.files.list({
      q: `'${selectedFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder'`,
      fields: "files(id, name)",
      pageSize: Math.min(limit + offset + 10, 1000), // Get a bit more than needed for pagination
    });
    
    // If no subfolders, return empty array
    if (!subfolderResponse.data.files?.length) {
      const response = createSuccessResponse<FlashcardData[]>([]);
      return addCacheHeaders(response, 300);
    }

    // Apply pagination to subfolders
    const paginatedSubfolders = subfolderResponse.data.files.slice(offset, offset + limit);
    console.log(`Processing ${paginatedSubfolders.length} subfolders (${offset} to ${offset + limit})`);

    // For each subfolder, fetch all JSON files
    const flashcardData = await Promise.all(
      paginatedSubfolders.map(async (folder: DriveFile) => {
        console.log(`Processing folder: ${folder.name}`);
        
        const fileResponse = await drive.files.list({
          q: `'${folder.id}' in parents and (mimeType = 'application/json' or name contains '.json')`,
          fields: "files(id, name, mimeType)",
          pageSize: 1000,
        });
        
        console.log(`Found ${fileResponse.data.files?.length || 0} JSON files in ${folder.name}:`, 
          fileResponse.data.files?.map((f: any) => `${f.name} (${f.mimeType})`) || []);
        
        const jsonFiles = await Promise.all(
          (fileResponse.data.files || []).map(async (file: DriveFile) => {
            try {
              const jsonData = await drive.files.get({
                fileId: file.id!,
                alt: "media",
              });
              
              // Limit the size of data returned for each file
              let data = jsonData.data;
              if (Array.isArray(data) && data.length > 100) {
                // Limit to first 100 data points to prevent huge responses
                data = data.slice(0, 100);
                console.log(`Truncated ${file.name} data from ${jsonData.data.length} to 100 items`);
              }
              
              return {
                fileName: file.name!,
                data: data,
              };
            } catch (error: any) {
              console.error(`Error fetching JSON file ${file.name}:`, error.message);
              return {
                fileName: file.name!,
                data: null,
                error: error.message
              };
            }
          })
        );
        
        // Filter out files that failed to load
        const validJsonFiles = jsonFiles.filter(f => f.data !== null);
        console.log(`Found ${validJsonFiles.length} valid JSON files in ${folder.name}`);
        
        return {
          name: folder.name!,
          jsonFiles: validJsonFiles
        } as FlashcardData;
      })
    );

    // Filter out folders with no valid JSON files
    const validFlashcardData = flashcardData.filter(item => item.jsonFiles.length > 0);
    
    console.log(`Returning ${validFlashcardData.length} flashcard items`);
    const response = createSuccessResponse<FlashcardData[]>(validFlashcardData);
    return addCacheHeaders(response, 300);
  } catch (error: any) {
    // Log error but return empty array to maintain compatibility
    console.error("Error fetching files:", error.message);
    
    // For compatibility, return empty array instead of error
    const response = createSuccessResponse<FlashcardData[]>([]);
    return addCacheHeaders(response, 300);
  }
}

// Export with middleware
export const GET = composeMiddleware(
  withEnvironmentValidation([
    'GOOGLE_SERVICE_ACCOUNT_PROJECT_ID',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL',
    'GOOGLE_DRIVE_PARENT_FOLDER_ID'
  ]),
  withErrorHandling
)(getFileData); 